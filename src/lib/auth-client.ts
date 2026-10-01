import { createAuthClient } from 'better-auth/react'
import { organizationClient, twoFactorClient } from 'better-auth/client/plugins'
import { ac, roles } from '@/lib/permissions'

export const authClient = createAuthClient({
  baseURL: 'http://localhost:3000',
  plugins: [
    twoFactorClient(),
    organizationClient({
      ac,
      roles
    })
  ]
})

export const { signIn, signUp, useSession } = createAuthClient()
