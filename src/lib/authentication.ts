import 'server-only'

import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { auth } from './auth'
import { OrgContext } from './validations/auth'
import * as organizationService from "@/server/services/organization";
import { cache } from 'react'
import { resolveOrgContext } from './authz'

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function redirectIfSignedIn() {
  const session = await getSession()
  if (session?.user) redirect('/dashboard')
}

export default async function requireSession(redirectTo: string) {
  const session = await getSession()
  if (!session?.user) {
    const next = redirectTo ? `?next=${redirectTo}` : ''
    redirect('/sign-in' + next)
  }

  return session
}

export type ActiveOrganization = {
  session: Awaited<ReturnType<typeof requireSession>>
  organization: Awaited<ReturnType<typeof organizationService.bySlug>>
  ctx: OrgContext
}

export const requireActiveOrganization = cache(
  async function requireActiveOrganization(
    orgSlug: string,
    path: string
  ): Promise<ActiveOrganization> {
    const session = await requireSession(path)

    const protectedCtx = { session, userId: session.user.id }

    const organisation = await organizationService
      .bySlug(protectedCtx, {
        slug: orgSlug
      })
      .catch(() => null)

    if (!organisation) notFound()

    if (session.session.activeOrganizationId !== organisation.id) {
      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: { organizationId: organisation.id }
      })

      const pathname = (await headers()).get('x-pathname') ?? path
      redirect(pathname)
    }

    return {
      session,
      organization: organisation,
      ctx: await resolveOrgContext(protectedCtx)
    }
  }
)
