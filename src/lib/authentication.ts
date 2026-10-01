import 'server-only'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './auth'

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function redirectIfSignedIn() {
  const session = await getSession()
  if (session?.user) redirect('/dashboard')
}
