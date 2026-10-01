import z from 'zod'
import { Session } from '../auth'
import { ProjectVisibility } from '@/generated/prisma/enums'

const password = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')

const email = z
  .email('Digite um email válido')
  .max(200, 'Esse endereço de email é muito longo')

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Senha é obrigatória.')
})

export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Digite seu nome')
      .max(80, 'Esse nome é muito longo'),
    email,
    password,
    confirmPassword: z.string().min(1, 'Confirme sua senha')
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'As senha não coincidem',
    path: ['confirmPassword']
  })

export const onboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Digite seu nome')
    .max(80, 'Esse nome é muito longo'),
  organizationName: z
    .string()
    .trim()
    .min(1, 'Nome da sua organização')
    .max(80, 'Esse nome é muito longo')
})

export type SignInFormData = z.infer<typeof signInSchema>
export type SignUpFormData = z.infer<typeof signUpSchema>
export type OnboardingFormData = z.infer<typeof onboardingSchema>

export type ProtectedContext = {
  session: Session
  userId: string
}

export type OrgContext = ProtectedContext & {
  orgId: string
  role: string
  member: {
    id: string
    role: string
    userId: string
    organizationId: string
    createdAt: Date
  }
}

export function slugify(value: string): string {
  return (
    value
      .normalize('NFKD')
      // Strip the combining marks NFKD just split off, so "Café" becomes "cafe".
      // Escaped as a Unicode property, not a literal character range: a literal
      // combining range is invisible in a diff and trivially broken by an editor.
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48)
  )
}

export type ProjectContext = OrgContext & {
  project: {
    id: string
    visibility: ProjectVisibility
    archivedAt: Date | null
  }
}

export type TaskContext = ProjectContext & {
  task: {
    id: string
    projectId: string
    statusId: string
    parentId: string | null
    rank: string
  }
}
