import { Prisma } from '@/generated/prisma/client'
import { ProjectVisibility } from '@/generated/prisma/enums'
import { ActivityType } from '@/lib/activity-types'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { OrgContext } from '@/lib/validations/auth'
import { DEFAULT_WORKFLOW_STATUSES } from '@/lib/workflow-statues'
import { TRPCError } from '@trpc/server'

export const DEFAULT_LIMIT = 50
export const MAX_LIMIT = 100

export function seesEveryProject(ctx: OrgContext): boolean {
  return hasPermission(ctx.role, { project: ['delete'] })
}

export function visibilityFilter(ctx: OrgContext): Prisma.ProjectWhereInput {
  if (seesEveryProject(ctx)) return {}
  return {
    OR: [
      { visibility: ProjectVisibility.OPEN },
      { members: { some: { memberId: ctx.member.id } } }
    ]
  }
}

export type ListProjectsInput = {
  cursor?: string
  limit?: number
  /** Archived projects are hidden unless asked for — the sidebar never wants them. */
  includeArchived?: boolean
  query?: string
}

export const projectSelect = {
  id: true,
  name: true,
  description: true,
  color: true,
  icon: true,
  visibility: true,
  ownerId: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.ProjectSelect

export async function list(ctx: OrgContext, input: ListProjectsInput = {}) {
  const limit = Math.min(input?.limit ?? DEFAULT_LIMIT)

  const rows = await prisma.project.findMany({
    where: {
      organizationId: ctx.orgId,
      ...(input.includeArchived ? {} : { archivedAt: null }),
      ...(input.query
        ? { name: { contains: input.query, mode: 'insensitive' } }
        : {}),
      ...visibilityFilter(ctx)
    },
    select: {
      ...projectSelect,
      _count: { select: { tasks: { where: { archivedAt: null } } } }
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {})
  })

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows

  return {
    items: items.map(({ _count, ...project }) => ({
      ...project,
      taskCount: _count
    })),
    nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null
  }
}

export async function byId(ctx: OrgContext, input: { projectId: string }) {
  const project = await prisma.project.findFirst({
    where: {
      id: input.projectId,
      organizationId: ctx.orgId,
      ...visibilityFilter(ctx),
    },
    select: {
      ...projectSelect,
      _count: {
        select: { tasks: { where: { archivedAt: null } }, members: true },
      },
    },
  });

  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
  }

  const { _count, ...rest } = project;
  return { ...rest, taskCount: _count.tasks, memberCount: _count.members };
}

export type CreateProjectInput = {
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  visibility: ProjectVisibility;
};

export async function create(ctx: OrgContext, input: CreateProjectInput) {
  //   TODO: later;
  //   await entitlementService.assertWithin(ctx, "project");

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        organizationId: ctx.orgId,
        name: input.name,
        description: input.description ?? null,
        color: input.color,
        icon: input.icon,
        visibility: input.visibility,
        ownerId: ctx.member.id,

        ...(input.visibility === ProjectVisibility.RESTRICTED
          ? { members: { create: { memberId: ctx.member.id } } }
          : {}),

        workflowStatuses: {
          create: DEFAULT_WORKFLOW_STATUSES.map((status) => ({
            organizationId: ctx.orgId,
            name: status.name,
            color: status.color,
            position: status.position,
            category: status.category,
          })),
        },
      },
      select: projectSelect,
    });

    await tx.activityEvent.create({
      data: {
        type: ActivityType.PROJECT_CREATED,
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        projectId: created.id,
        payload: { projectId: created.id, name: created.name },
      },
    });

    return created;
  });

  return project;
}

export type UpdateProjectInput = {
  projectId: string;
  name?: string;
  description?: string | null;
  color?: string;
  icon?: string;
  visibility?: ProjectVisibility;
};

export async function update(ctx: OrgContext, input: UpdateProjectInput) {
  const { projectId, ...changes } = input;

  await byId(ctx, { projectId });

  const project = await prisma.project.update({
    where: { id: projectId },
    data: changes,
    select: projectSelect,
  });

  if (
    changes.visibility === ProjectVisibility.RESTRICTED &&
    project.ownerId !== null
  ) {
    await prisma.projectMember.createMany({
      data: [{ projectId, memberId: project.ownerId }],
      skipDuplicates: true,
    });
  }

  return project;
}


export async function setArchived(
  ctx: OrgContext,
  input: { projectId: string; archived: boolean },
) {
  await byId(ctx, { projectId: input.projectId });

  const project = await prisma.project.update({
    where: { id: input.projectId },
    data: { archivedAt: input.archived ? new Date() : null },
    select: projectSelect,
  });

  return project;
}

export async function remove(ctx: OrgContext, input: { projectId: string }) {
  const project = await byId(ctx, { projectId: input.projectId });

  await prisma.project.delete({ where: { id: input.projectId } });

  return { id: project.id };
}


export async function listMembers(
  ctx: OrgContext,
  input: { projectId: string },
) {
  await byId(ctx, { projectId: input.projectId });

  const rows = await prisma.projectMember.findMany({
    where: { projectId: input.projectId },
    select: {
      id: true,
      memberId: true,
      createdAt: true,
      member: {
        select: {
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: MAX_LIMIT,
  });

  return rows.map((row) => ({
    id: row.id,
    memberId: row.memberId,
    addedAt: row.createdAt,
    role: row.member.role,
    name: row.member.user.name,
    email: row.member.user.email,
    image: row.member.user.image,
  }));
}


export async function addMember(
  ctx: OrgContext,
  input: { projectId: string; memberId: string },
) {
  await byId(ctx, { projectId: input.projectId });

  const member = await prisma.member.findFirst({
    where: { id: input.memberId, organizationId: ctx.orgId },
    select: { id: true },
  });

  if (!member) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Membro não encontrado" });
  }

  await prisma.projectMember.createMany({
    data: [{ projectId: input.projectId, memberId: member.id }],

    skipDuplicates: true,
  });

  return { projectId: input.projectId, memberId: member.id };
}


export async function removeMember(
  ctx: OrgContext,
  input: { projectId: string; memberId: string },
) {
  await byId(ctx, { projectId: input.projectId });

  // deleteMany, scoped by projectId, so a membership row belonging to another
  // project cannot be removed by id alone.
  await prisma.projectMember.deleteMany({
    where: { projectId: input.projectId, memberId: input.memberId },
  });

  return { projectId: input.projectId, memberId: input.memberId };
}