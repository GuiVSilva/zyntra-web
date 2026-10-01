import requireSession from '@/lib/authentication'
import * as organizationServices from '@/server/services/organization'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

const DashboardPage = async () => {
  const session = await requireSession('/dashboard')

  const organizations = await organizationServices.listForUser({
    session,
    userId: session.user.id
  })

  if (organizations?.length === 0) redirect('/onboarding')

  const activeId = session.session.activeOrganizationId
  const active = organizations.find(
    organization => organization?.id === activeId
  )

  redirect(`/${(active ?? organizations[0]).slug}`)
}

export default DashboardPage
