import { createAuthClient } from 'better-auth/react'
import { twoFactorClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: 'http://localhost:3000',
  plugins: [twoFactorClient()]
})

export const { signIn, signUp, useSession } = createAuthClient()
