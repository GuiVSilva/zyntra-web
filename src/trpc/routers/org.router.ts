import z from "zod";
import { createTRPCRouter, orgProcedure, protectedProcedure } from "../init";
import * as organizationService from "@/server/services/organization";
import * as memberService from "@/server/services/member.service";

export const bySlugInput = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(
      /^[a-z0-9-]+$/,
      "Organization URLs use lowercase letters and dashes",
    ),
});
export const memberByIdInput = z.object({ memberId: z.string().min(1) });

export const listMembersInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  query: z.string().trim().min(1).max(100).optional(),
});

export const orgRouter = createTRPCRouter({
  /** Every organization the caller belongs to. Powers the switcher. */
  list: protectedProcedure.query(({ ctx }) =>
    organizationService.listForUser(ctx),
  ),

  /** Resolves an `[orgSlug]` segment against the caller's memberships. */
  bySlug: protectedProcedure
    .input(bySlugInput)
    .query(({ ctx, input }) => organizationService.bySlug(ctx, input)),

  members: orgProcedure
    .input(listMembersInput)
    .query(({ ctx, input }) => memberService.list(ctx, input)),

  member: orgProcedure
    .input(memberByIdInput)
    .query(({ ctx, input }) => memberService.byId(ctx, input)),

  /**
   * Gated on the ability to invite: a pending invitation list is a list of email
   * addresses of people who are not members yet, and only the people who can
   * send or cancel one have a reason to see it.
   */
  //   invitations: permittedProcedure({ invitation: ["create"] }).query(({ ctx }) =>
  //     memberService.listInvitations(ctx),
  //   ),
});