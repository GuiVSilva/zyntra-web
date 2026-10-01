import "server-only";

import { TRPCError } from "@trpc/server";
import {
  OrgContext,
  ProjectContext,
  ProtectedContext,
  TaskContext,
} from "./validations/auth";
import { hasPermission } from "./permissions";
import { ProjectVisibility } from "@/generated/prisma/enums";
import { prisma } from "./prisma";

export const AuthzCause = {
  NO_ACTIVE_ORGANIZATION: "no_active_organization",
  NOT_A_MEMBER: "not_a_member",
} as const;

export async function resolveOrgContext(
  ctx: ProtectedContext,
): Promise<OrgContext> {
  const organizationId = ctx.session.session.activeOrganizationId;

  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Selecione uma organização para continuar",
      cause: AuthzCause.NO_ACTIVE_ORGANIZATION,
    });
  }

  const member = await prisma.member.findFirst({
    where: { organizationId, userId: ctx.userId },
    select: {
      id: true,
      role: true,
      userId: true,
      organizationId: true,
      createdAt: true,
    },
  });

  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are no longer a member of this organization Você não é mais membro desta organização",
      cause: AuthzCause.NOT_A_MEMBER,
    });
  }

  return {
    ...ctx,
    orgId: member.organizationId,
    role: member.role,
    member,
  };
}

export async function resolveProjectContext(
  ctx: OrgContext,
  projectId: string,
): Promise<ProjectContext> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: ctx.orgId,
      ...(hasPermission(ctx.role, { project: ["delete"] })
        ? {}
        : {
            OR: [
              { visibility: ProjectVisibility.OPEN },
              { members: { some: { memberId: ctx.member.id } } },
            ],
          }),
    },
    select: {
      id: true,
      visibility: true,
      archivedAt: true,
    },
  });

  if (!project) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Projeto não encontrado",
    });
  }

  return { ...ctx, project };
}

export async function resolveTaskContext(
  ctx: OrgContext,
  taskId: string,
): Promise<TaskContext> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: ctx.orgId },
    select: {
      id: true,
      projectId: true,
      statusId: true,
      parentId: true,
      rank: true,
    },
  });

  if (!task) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada" });
  }

  const withProject = await resolveProjectContext(ctx, task.projectId);
  return { ...withProject, task };
}