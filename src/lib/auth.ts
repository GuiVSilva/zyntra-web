import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@/lib/prisma'
import { organization, twoFactor } from 'better-auth/plugins'
import { ac, roles } from './permissions'
import {
  defaultPlan,
  maxMembersFor,
  ORGANIZATIONS_PER_USER,
  PLAN_LIMITS
} from './entitlements'
import { DEFAULT_WORKFLOW_STATUSES } from './workflow-statues'

const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql'
  }),
  trustedOrigins: [process.env.BETTER_AUTH_URL as string],
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string
    }
  },
  appName: 'zyntra',
  plugins: [
    twoFactor({ issuer: 'zyntra' }),
    organization({
      ac,
      roles,
      creatorRole: 'owner',
      allowUserToCreateOrganization: user => user.emailVerified, // allow users to create organizations

      organizationLimit: ORGANIZATIONS_PER_USER,

      membershipLimit: (_user, organization) => maxMembersFor(organization.id), // limit the number of organizations a user can be a member of

      invitationExpiresIn: SEVEN_DAYS_IN_SECONDS, // 7 days
      invitationLimit: 100, // 100 invitations per organization
      cancelPendingInvitationsOnReInvite: true, // cancel pending invitations when a new invitation is sent to the same email

      sendInvitationEmail: async invitation => {
        // send invitation email to the user
        // you can use any email service provider like SendGrid, Postmark, etc.
        console.log(`Sending invitation email to ${invitation.email}`)
      },

      organizationHooks: {
        afterCreateOrganization: async ({ organization, user }) => {
          const limits = PLAN_LIMITS[defaultPlan()]

          await prisma.entitlement.create({
            data: {
              organizationId: organization.id,
              plan: defaultPlan(),
              ...limits
            }
          })

          const creator = await prisma.member.findFirst({
            where: { organizationId: organization.id, userId: user.id },
            select: { id: true }
          })

          await prisma.project.create({
            data: {
              name: 'Geral',
              description:
                'Reúna tarefas novas aqui e organize-as nos projetos certos.',
              ownerId: creator?.id ?? null,
              organizationId: organization.id,

              workflowStatuses: {
                create: DEFAULT_WORKFLOW_STATUSES.map(status => ({
                  organizationId: organization.id,
                  name: status.name,
                  color: status.color,
                  position: status.position,
                  category: status.category
                }))
              }
            }
          })
        }
      }

      // beforeDeleteOrganization: async ({ organization, user }) => {
      //   const [members, pendingInvitations, entitlement] = await Promise.all([
      //     prisma.member.findMany({
      //       where: { organizationId: organization.id },
      //       select: { id: true, userId: true, createdAt: true }
      //     }),
      //     prisma.invitation.findMany({
      //       where: { organizationId: organization.id, status: 'pending' },
      //       select: { id: true, email: true, createdAt: true }
      //     }),
      //     prisma.entitlement.findFirst({
      //       where: { organizationId: organization.id },
      //       select: { id: true, plan: true }
      //     })
      //   ])
      //   // TODO: record activity for members, pending invitations, and entitlement deletion
      // }
    })
  ]
})

export type Session = typeof auth.$Infer.Session
