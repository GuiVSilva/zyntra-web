import { Plan } from '@/generated/prisma/enums'
import { prisma } from './prisma'

export const ORGANIZATIONS_PER_USER = 5
const isBillingConfigured =
  !!process.env.POLARIS_API_KEY && !!process.env.POLARIS_API_SECRET

export type PlanLimits = {
  maxProjects: number | null
  maxTasks: number | null
  maxMembers: number | null
  maxStorageBytes: bigint | null
}

const GB = BigInt(1024) * BigInt(1024) * BigInt(1024)

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  [Plan.FREE]: {
    maxProjects: 10,
    maxTasks: 100,
    maxMembers: 3,
    maxStorageBytes: BigInt(0)
  },
  [Plan.PRO]: {
    maxProjects: 500,
    maxTasks: 5000,
    maxMembers: 20,
    maxStorageBytes: BigInt(5) * GB
  },
  [Plan.ENTERPRISE]: {
    maxProjects: null,
    maxTasks: null,
    maxMembers: null,
    maxStorageBytes: BigInt(100) * GB
  },
  [Plan.SELF_HOSTED]: {
    maxProjects: null,
    maxTasks: null,
    maxMembers: null,
    maxStorageBytes: null
  }
}

export function defaultPlan(): Plan {
  return isBillingConfigured ? Plan.FREE : Plan.SELF_HOSTED
}

const UNLIMITED = Number.MAX_SAFE_INTEGER

export const maxMembersFor = async (
  organizationId: string
): Promise<number> => {
  const entitlement = await prisma.entitlement.findUnique({
    where: {
      organizationId
    },
    select: { maxMembers: true }
  })

  if (!entitlement) return PLAN_LIMITS[defaultPlan()].maxMembers || UNLIMITED
  return entitlement?.maxMembers ?? UNLIMITED
}
