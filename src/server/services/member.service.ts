import { prisma } from "@/lib/prisma";
import { OrgContext } from "@/lib/validations/auth";
import { TRPCError } from "@trpc/server";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export type ListMembersInput = {
  cursor?: string;
  limit?: number;
  /** Case-insensitive match against name or email. */
  query?: string;
};

export async function list(ctx: OrgContext, input: ListMembersInput = {}) {
  const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const rows = await prisma.member.findMany({
    where: {
      organizationId: ctx.orgId,
      ...(input.query
        ? {
            user: {
              OR: [
                { name: { contains: input.query, mode: "insensitive" } },
                { email: { contains: input.query, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    select: {
      id: true,
      role: true,
      createdAt: true,
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          avatarKey: true,
        },
      },
    },
    // `id` breaks ties: `createdAt` alone is not unique, and a cursor that
    // lands on a duplicated timestamp would skip or repeat a row.
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: items.map((member) => ({
      id: member.id,
      role: member.role,
      joinedAt: member.createdAt,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      image: member.user,
      /** So the UI can mark "you" without a second source of truth. */
      isSelf: member.userId === ctx.userId,
    })),
    nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
  };
}

export async function byId(ctx: OrgContext, input: { memberId: string }) {
  // findFirst with organizationId, never findUnique by id — lint-enforced, and
  // the reason is that a foreign id must be indistinguishable from a missing one.
  const member = await prisma.member.findFirst({
    where: { id: input.memberId, organizationId: ctx.orgId },
    select: {
      id: true,
      role: true,
      createdAt: true,
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          avatarKey: true,
        },
      },
    },
  });

  if (!member) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
  }

  return {
    id: member.id,
    role: member.role,
    joinedAt: member.createdAt,
    userId: member.userId,
    name: member.user.name,
    email: member.user.email,
    image: member.user,
    isSelf: member.userId === ctx.userId,
  };
}