import { Prisma } from "@/generated/prisma/client";
import { ProjectVisibility, StatusCategory } from "@/generated/prisma/enums";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { OrgContext } from "@/lib/validations/auth";
import { TRPCError } from "@trpc/server";
import "server-only";

const MAX_STATUSES_PER_PROJECT = 20;

function seesEveryProject(ctx: OrgContext): boolean {
  return hasPermission(ctx.role, { project: ["delete"] });
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
              { members: { some: { memberId: ctx.member.id } } },
            ],
          }),
    },
    select: { id: true },
  });

  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  return project;
}

const statusSelect = {
  id: true,
  projectId: true,
  name: true,
  color: true,
  position: true,
  category: true,
} satisfies Prisma.WorkflowStatusSelect;

type StatusRow = Prisma.WorkflowStatusGetPayload<{
  select: typeof statusSelect;
}>;

export type WorkflowStatusRow = StatusRow & {
  taskCount: number;
};

function toRow(row: StatusRow & { _count: { tasks: number } }) {
  const { _count, ...status } = row;
  return { ...status, taskCount: _count.tasks };
}

export async function listForProject(
  ctx: OrgContext,
  input: { projectId: string },
): Promise<WorkflowStatusRow[]> {
  const project = await requireProject(ctx, input.projectId);

  const rows = await prisma.workflowStatus.findMany({
    where: { projectId: project.id, organizationId: ctx.orgId },
    select: {
      ...statusSelect,
      _count: { select: { tasks: { where: { archivedAt: null } } } },
    },
    // The board's left-to-right order is this column and nothing else. `id`
    // breaks the tie that (project_id, position) already makes impossible —
    // cheap insurance against a future where the unique is relaxed.
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });

  return rows.map(toRow);
}

async function requireStatus(ctx: OrgContext, statusId: string) {
  const status = await prisma.workflowStatus.findFirst({
    where: {
      id: statusId,
      organizationId: ctx.orgId,
      ...(seesEveryProject(ctx)
        ? {}
        : {
            project: {
              OR: [
                { visibility: ProjectVisibility.OPEN },
                { members: { some: { memberId: ctx.member.id } } },
              ],
            },
          }),
    },
    select: statusSelect,
  });

  if (!status) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Status not found" });
  }

  return status;
}

export type CreateStatusInput = {
  projectId: string;
  name: string;
  color: string;
  category: StatusCategory;
};

export async function create(
  ctx: OrgContext,
  input: CreateStatusInput,
): Promise<WorkflowStatusRow> {
  const project = await requireProject(ctx, input.projectId);

  const created = await prisma
    .$transaction(async (tx) => {
      const count = await tx.workflowStatus.count({
        where: { projectId: project.id },
      });

      if (count >= MAX_STATUSES_PER_PROJECT) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `A board can hold ${MAX_STATUSES_PER_PROJECT} columns. Remove one before adding another.`,
        });
      }

      const last = await tx.workflowStatus.findFirst({
        where: { projectId: project.id },
        orderBy: { position: "desc" },
        select: { position: true },
      });

      return tx.workflowStatus.create({
        data: {
          organizationId: ctx.orgId,
          projectId: project.id,
          name: input.name,
          color: input.color,
          category: input.category,
          position: (last?.position ?? -1) + 1,
        },
        select: {
          ...statusSelect,
          _count: { select: { tasks: { where: { archivedAt: null } } } },
        },
      });
    })
    .catch(rethrowDuplicateName(input.name));

  return toRow(created);
}

export type UpdateStatusInput = {
  statusId: string;
  name?: string;
  color?: string;
  category?: StatusCategory;
};

export async function update(
  ctx: OrgContext,
  input: UpdateStatusInput,
): Promise<WorkflowStatusRow> {
  const { statusId, ...changes } = input;
  const existing = await requireStatus(ctx, statusId);

  const updated = await prisma.workflowStatus
    .update({
      where: { id: statusId },
      data: changes,
      select: {
        ...statusSelect,
        _count: { select: { tasks: { where: { archivedAt: null } } } },
      },
    })
    .catch(rethrowDuplicateName(changes.name ?? existing.name));

  return toRow(updated);
}

function rethrowDuplicateName(name: string) {
  return (cause: unknown): never => {
    if (
      cause !== null &&
      typeof cause === "object" &&
      "code" in cause &&
      cause.code === "P2002"
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `This board already has a column called "${name}"`,
        cause,
      });
    }
    throw cause;
  };
}

export type ReorderStatusesInput = {
  projectId: string;
  /** Every status on the board, in the order it should now appear. */
  statusIds: string[];
};

export async function reorder(
  ctx: OrgContext,
  input: ReorderStatusesInput,
): Promise<WorkflowStatusRow[]> {
  const project = await requireProject(ctx, input.projectId);

  const existing = await prisma.workflowStatus.findMany({
    where: { projectId: project.id, organizationId: ctx.orgId },
    select: { id: true },
  });

  const known = new Set(existing.map((row) => row.id));

  // A foreign id — another tenant's, or a sibling project's — must be
  // indistinguishable from one that does not exist. This runs before the count
  // check so that naming someone else's status never produces the more
  // informative BAD_REQUEST.
  for (const id of input.statusIds) {
    if (!known.has(id)) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Status not found" });
    }
  }

  if (
    input.statusIds.length !== existing.length ||
    new Set(input.statusIds).size !== input.statusIds.length
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A reorder must list every column on the board exactly once",
    });
  }

  await prisma.$transaction(async (tx) => {
    /**
     * Two passes, and the first one is not optional.
     *
     * `@@unique([projectId, position])` means a reorder cannot write final
     * positions directly: reversing a board sends the row at 0 to 5 while 5 is
     * still occupied, and the constraint rejects it.
     *
     * **A single `UPDATE … FROM (VALUES)` does not save this**, which is worth
     * recording because it is a widely-repeated belief and it was this plan's
     * first attempt. PostgreSQL's end-of-statement deferral does not extend to
     * an update joined against a value list; the statement failed with 23505
     * against the real schema, and the test below is what caught it.
     *
     * So: park every row in the negative range first — positions are always
     * >= 0, so `-(position + 1)` cannot collide with anything — then write the
     * final values, which cannot collide either because nothing non-negative is
     * left. Two round trips inside one transaction, and no constraint relaxed.
     *
     * `WITH ORDINALITY` is one-based and `position` is zero-based, hence the
     * `- 1`: every other index in this codebase counts from zero, and storing
     * one-based positions to save an arithmetic operation would be the kind of
     * saving that costs an afternoon later.
     */
    await tx.$executeRaw`
      UPDATE "workflow_status"
      SET "position" = -("position" + 1)
      WHERE "project_id" = ${project.id}
        AND "organization_id" = ${ctx.orgId}
    `;

    await tx.$executeRaw`
      UPDATE "workflow_status" AS ws
      SET "position" = v."ord"::int - 1
      FROM (
        SELECT * FROM unnest(${input.statusIds}::text[]) WITH ORDINALITY AS t(id, ord)
      ) AS v
      WHERE ws."id" = v."id"
        AND ws."project_id" = ${project.id}
        AND ws."organization_id" = ${ctx.orgId}
    `;
  });

  return listForProject(ctx, { projectId: project.id });
}

export async function remove(ctx: OrgContext, input: { statusId: string }) {
  const status = await requireStatus(ctx, input.statusId);

  const [taskCount, statusCount] = await Promise.all([
    // Archived tasks count here even though they do not count in `taskCount`
    // above. The restriction is a foreign key, and a foreign key does not care
    // whether a row is archived.
    prisma.task.count({
      where: { statusId: status.id, organizationId: ctx.orgId },
    }),
    prisma.workflowStatus.count({ where: { projectId: status.projectId } }),
  ]);

  if (taskCount > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Move the ${taskCount} ${taskCount === 1 ? "task" : "tasks"} out of "${status.name}" before deleting it`,
    });
  }

  if (statusCount <= 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A board needs at least one column",
    });
  }

  await prisma.workflowStatus.delete({ where: { id: status.id } });

  return { id: status.id };
}