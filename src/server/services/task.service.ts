import {
  Prisma,
  ProjectVisibility,
  StatusCategory,
  TaskPriority
} from '@/generated/prisma/client'
import { isDoneCategory, parseDocument, toPlainText } from '@/lib/rich-text'
import { OrgContext } from '@/lib/validations/auth'
import { DEFAULT_LIMIT, MAX_LIMIT, seesEveryProject } from './project.service'
import { TRPCError } from '@trpc/server'
import { rankBetween } from '@/lib/rank'
import { ActivityType } from '@/lib/activity-types'
import { prisma } from '@/lib/prisma'

function derivedText(description: string | null | undefined): string | null {
  if (description === undefined || description === null) return null
  const text = toPlainText(parseDocument(description))
  return text === '' ? null : text
}

export const taskSelect = {
  id: true,
  projectId: true,
  statusId: true,
  parentId: true,
  title: true,
  description: true,

  descriptionText: true,
  priority: true,
  rank: true,
  startDate: true,
  dueDate: true,
  assigneeId: true,
  completedAt: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { id: true, name: true, color: true, icon: true } },
  status: { select: { id: true, name: true, color: true, category: true } },
  labels: {
    select: { label: { select: { id: true, name: true, color: true } } },
    // Stable order, so two renders of the same card do not shuffle its pills.
    orderBy: { label: { name: 'asc' } }
  },
  assignee: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      }
    }
  }
} satisfies Prisma.TaskSelect

type TaskRow = Prisma.TaskGetPayload<{ select: typeof taskSelect }>

async function assignmentDrafts(
  ctx: OrgContext,
  args: {
    tx: Prisma.TransactionClient
    previousAssigneeId: string | null
    task: TaskRow
  }
): Promise<{ id: string }[]> {
  const { tx, previousAssigneeId, task } = args
  const assignee = task.assignee

  if (!assignee) return []
  if (assignee.id === previousAssigneeId) return []

  //   return notificationService.create(tx, [
  //     {
  //       organizationId: ctx.orgId,
  //       userId: assignee.user.id,
  //       actorId: ctx.userId,
  //       type: NotificationType.TASK_ASSIGNED,
  //       title: `${ctx.session.user.name} assigned you “${task.title}”`,
  //       taskId: task.id,
  //     },
  //   ]);
  return []
}

export type TaskSort = 'rank' | 'dueDate' | 'priority' | 'title' | 'createdAt'

export type ListTasksInput = {
  projectId?: string
  statusIds?: string[]
  labelIds?: string[]
  priority?: TaskPriority[]
  assigneeIds?: (string | null)[]

  parentId?: string | null
  query?: string
  dueFrom?: Date
  dueTo?: Date
  includeArchived?: boolean
  sort?: TaskSort

  order?: 'asc' | 'desc'
  cursor?: string
  limit?: number
}

export function visibleProjectFilter(ctx: OrgContext): Prisma.TaskWhereInput {
  if (seesEveryProject(ctx)) return {}
  return {
    project: {
      OR: [
        { visibility: ProjectVisibility.OPEN },
        { members: { some: { memberId: ctx.member.id } } }
      ]
    }
  }
}

function buildAssigneeFilter(
  assigneeIds: (string | null)[] | undefined
): Prisma.TaskWhereInput {
  if (!assigneeIds?.length) return {}

  const ids = assigneeIds.filter((id): id is string => id !== null)
  const wantsUnassigned = assigneeIds.includes(null)

  if (!wantsUnassigned) return { assigneeId: { in: ids } }
  if (ids.length === 0) return { assigneeId: null }
  return { OR: [{ assigneeId: { in: ids } }, { assigneeId: null }] }
}

export type SubtaskCount = { done: number; total: number }

export type TaskSummary = {
  id: string
  projectId: string
  statusId: string
  parentId: string | null
  title: string
  /** The TipTap document, stringified. For the editor, never for display. */
  description: string | null
  /** What the document says, for a card preview or a list cell. */
  descriptionText: string | null
  priority: TaskPriority
  rank: string
  startDate: Date | null
  dueDate: Date | null
  completedAt: Date | null
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
  project: { id: string; name: string; color: string; icon: string }
  status: {
    id: string
    name: string
    color: string
    category: StatusCategory
  }
  labels: { id: string; name: string; color: string }[]
  subtaskCount: SubtaskCount
  assignee: {
    memberId: string
    userId: string
    name: string
    email: string
    image: string | null
  } | null
}

const NO_SUBTASKS: SubtaskCount = { done: 0, total: 0 }

function toSummary(
  row: TaskRow,
  counts?: Map<string, SubtaskCount>
): TaskSummary {
  const { assignee, labels, ...task } = row
  return {
    ...task,
    labels: labels.map(join => join.label),
    subtaskCount: counts?.get(row.id) ?? NO_SUBTASKS,
    assignee: assignee
      ? {
          memberId: assignee.id,
          userId: assignee.user.id,
          name: assignee.user.name!,
          email: assignee.user.email,
          image: assignee.user.image
        }
      : null
  }
}

async function subtaskCounts(
  orgId: string,
  parentIds: string[]
): Promise<Map<string, SubtaskCount>> {
  if (parentIds.length === 0) return new Map()

  const where: Prisma.TaskWhereInput = {
    organizationId: orgId,
    parentId: { in: parentIds },
    archivedAt: null
  }

  const [totals, done] = await Promise.all([
    prisma.task.groupBy({ by: ['parentId'], where, _count: { _all: true } }),
    prisma.task.groupBy({
      by: ['parentId'],
      where: { ...where, status: { category: StatusCategory.DONE } },
      _count: { _all: true }
    })
  ])

  const doneByParent = new Map(done.map(row => [row.parentId, row._count._all]))

  const counts = new Map<string, SubtaskCount>()
  for (const row of totals) {
    if (row.parentId === null) continue
    counts.set(row.parentId, {
      done: doneByParent.get(row.parentId) ?? 0,
      total: row._count._all
    })
  }
  return counts
}

function orderFor(
  sort: TaskSort,
  order: 'asc' | 'desc'
): Prisma.TaskOrderByWithRelationInput[] {
  // `id` always trails, and it is what makes the cursor correct: every other
  // sort key here has duplicates, and a cursor on a duplicated value either
  // repeats a row or steps over one.
  const tie: Prisma.TaskOrderByWithRelationInput = { id: 'asc' }

  switch (sort) {
    case 'dueDate':
      // Postgres sorts NULLs last on ASC by default, which is what we want:
      // an undated task is not overdue and does not belong at the top of a
      // due-date sort. Stated explicitly so a Prisma default change cannot
      // quietly reverse it.
      return [{ dueDate: { sort: order, nulls: 'last' } }, tie]
    case 'priority':
      // The enum's declaration order is LOW → CRITICAL, and Postgres sorts an
      // enum by that order, so "desc" really is most-urgent-first.
      return [{ priority: order }, tie]
    case 'title':
      return [{ title: order }, tie]
    case 'createdAt':
      return [{ createdAt: order }, tie]
    case 'rank':
    default:
      return [{ rank: order }, tie]
  }
}

export async function list(ctx: OrgContext, input: ListTasksInput = {}) {
  const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
  const sort = input.sort ?? 'rank'
  const order = input.order ?? 'asc'

  const assigneeFilter = buildAssigneeFilter(input.assigneeIds)

  const where: Prisma.TaskWhereInput = {
    organizationId: ctx.orgId,
    ...(input.projectId ? { projectId: input.projectId } : {}),
    ...(input.includeArchived ? {} : { archivedAt: null }),
    ...(input.statusIds?.length ? { statusId: { in: input.statusIds } } : {}),
    ...(input.labelIds?.length
      ? { labels: { some: { labelId: { in: input.labelIds } } } }
      : {}),
    // ...(input.priority?.length ? { priority: { in: input.priority } } : {}),
    ...assigneeFilter,
    ...(input.query
      ? { title: { contains: input.query, mode: 'insensitive' } }
      : {}),
    ...(input.dueFrom || input.dueTo
      ? {
          dueDate: {
            ...(input.dueFrom ? { gte: input.dueFrom } : {}),
            ...(input.dueTo ? { lte: input.dueTo } : {})
          }
        }
      : {}),

    ...(input.parentId !== undefined
      ? { parentId: input.parentId }
      : input.projectId
        ? { parentId: null }
        : {}),
    ...visibleProjectFilter(ctx)
  }

  const [rows, totalCount] = await Promise.all([
    prisma.task.findMany({
      where,
      select: taskSelect,
      orderBy: orderFor(sort, order),
      take: limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {})
    }),
    prisma.task.count({ where })
  ])

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows

  // Only for the rows actually being returned, and only for the ones that could
  // have children — a subtask never has any, so asking about it is a round trip
  // spent proving zero.
  const counts = await subtaskCounts(
    ctx.orgId,
    items.filter(row => row.parentId === null).map(row => row.id)
  )

  return {
    items: items.map(row => toSummary(row, counts)),
    nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
    totalCount
  }
}

export async function byId(ctx: OrgContext, input: { taskId: string }) {
  const task = await prisma.task.findFirst({
    where: {
      id: input.taskId,
      organizationId: ctx.orgId,
      ...visibleProjectFilter(ctx)
    },
    select: taskSelect
  })

  if (!task) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Tarefa não encontrada' })
  }

  const counts =
    task.parentId === null
      ? await subtaskCounts(ctx.orgId, [task.id])
      : undefined

  return toSummary(task, counts)
}

export type CreateTaskInput = {
  projectId: string
  statusId: string
  title: string
  description?: string | null
  parentId?: string | null
  priority?: TaskPriority
  startDate?: Date | null
  dueDate?: Date | null
  assigneeId?: string | null
}

async function requireProject(ctx: OrgContext, projectId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: ctx.orgId,
      ...(seesEveryProject(ctx)
        ? {}
        : {
            OR: [
              { visibility: ProjectVisibility.OPEN },
              { members: { some: { memberId: ctx.member.id } } }
            ]
          })
    },
    select: { id: true, archivedAt: true }
  })

  if (!project) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Projeto não encontrado' })
  }

  return project
}

async function requireStatus(
  ctx: OrgContext,
  projectId: string,
  statusId: string
) {
  const status = await prisma.workflowStatus.findFirst({
    where: { id: statusId, projectId, organizationId: ctx.orgId },
    select: { id: true, category: true }
  })

  if (!status) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Status não encontrado' })
  }

  return status
}

async function requireParent(
  ctx: OrgContext,
  input: { projectId: string; parentId: string; taskId?: string }
) {
  if (input.taskId && input.taskId === input.parentId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Uma tarefa não pode ser seu próprio pai'
    })
  }

  const parent = await prisma.task.findFirst({
    where: {
      id: input.parentId,
      projectId: input.projectId,
      organizationId: ctx.orgId,
      ...visibleProjectFilter(ctx)
    },
    select: { id: true, parentId: true }
  })

  if (!parent) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Tarefa pai não encontrada'
    })
  }

  if (parent.parentId !== null) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Subtarefas não podem ter subtarefas próprias'
    })
  }

  return parent
}

async function requireAssignee(ctx: OrgContext, memberId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId: ctx.orgId },
    select: { id: true }
  })

  if (!member) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Membro não encontrado' })
  }

  return member
}

export async function create(ctx: OrgContext, input: CreateTaskInput) {
  const project = await requireProject(ctx, input.projectId)

  if (project.archivedAt) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Desarquive este projeto antes de adicionar tarefas a ele'
    })
  }

  const status = await requireStatus(ctx, project.id, input.statusId)

  if (input.parentId) {
    await requireParent(ctx, {
      projectId: project.id,
      parentId: input.parentId
    })
  }

  if (input.assigneeId) await requireAssignee(ctx, input.assigneeId)

  // New tasks land at the bottom of their column, which is where the reference
  // boards put them and where someone who just clicked "+" on a column expects
  // to find one.
  const last = await prisma.task.findFirst({
    where: {
      organizationId: ctx.orgId,
      projectId: project.id,
      statusId: status.id,
      archivedAt: null
    },
    orderBy: { rank: 'desc' },
    select: { rank: true }
  })

  const task = await prisma.$transaction(async tx => {
    const created = await tx.task.create({
      data: {
        organizationId: ctx.orgId,
        projectId: project.id,
        statusId: status.id,
        parentId: input.parentId ?? null,
        title: input.title,
        description: input.description ?? null,
        descriptionText: derivedText(input.description),
        priority: input.priority ?? TaskPriority.MEDIUM,
        rank: rankBetween(last?.rank ?? null, null),
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        assigneeId: input.assigneeId ?? null,
        completedAt: isDoneCategory(status.category) ? new Date() : null
      },
      select: taskSelect
    })

    await tx.activityEvent.create({
      data: {
        type: ActivityType.TASK_CREATED,
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        projectId: project.id,
        payload: {
          taskId: created.id,
          projectId: project.id,
          title: created.title
        }
      }
    })

    // `null` as the previous holder: a task created with an assignee has just
    // changed hands from nobody to somebody, which is exactly the event.
    const assignment = await assignmentDrafts(ctx, {
      tx,
      previousAssigneeId: null,
      task: created
    })

    return { task: created, assignment }
  })

  return toSummary(task.task)
}

async function readTask(ctx: OrgContext, taskId: string) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId: ctx.orgId,
      ...visibleProjectFilter(ctx)
    },
    select: {
      id: true,
      title: true,
      projectId: true,
      statusId: true,
      parentId: true,
      assigneeId: true,
      status: { select: { category: true } }
    }
  })

  if (!task) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Tarefa não encontrada' })
  }

  return task
}

export async function remove(ctx: OrgContext, input: { taskId: string }) {
  const task = await readTask(ctx, input.taskId)

  // Subtasks cascade with the parent — see the note on `Task.parentId`.
  await prisma.task.delete({ where: { id: input.taskId } })

  return { id: task.id }
}
