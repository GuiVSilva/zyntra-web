import { createAccessControl, type Role } from 'better-auth/plugins/access'
import {
  adminAc,
  memberAc,
  defaultAc,
  defaultStatements,
  ownerAc
} from 'better-auth/plugins/organization/access'

export const statements = {
  ...defaultStatements,
  project: ['create', 'archive', 'update', 'delete'],
  task: ['create', 'update', 'delete', 'assign'],
  label: ['create', 'update', 'delete'],
  comment: ['create', 'update', 'delete', 'moderate'],
  audit: ['read'],
  billing: ['manage']
} as const

export const ac = createAccessControl(statements)

// Full control for owner role
export const owner = ac.newRole({
  ...ownerAc.statements,
  project: ['create', 'archive', 'update', 'delete'],
  task: ['create', 'update', 'delete', 'assign'],
  label: ['create', 'update', 'delete'],
  comment: ['create', 'update', 'delete', 'moderate'],
  audit: ['read'],
  billing: ['manage']
})

export const admin = ac.newRole({
  ...adminAc.statements,
  project: ['create', 'archive', 'update', 'delete'],
  task: ['create', 'update', 'delete', 'assign'],
  label: ['create', 'update', 'delete'],
  comment: ['create', 'update', 'delete', 'moderate'],
  audit: ['read'],
  billing: []
})

export const member = ac.newRole({
  ...memberAc.statements,
  project: ['create', 'update', 'archive'],
  task: ['create', 'update', 'assign'],
  label: ['create'],
  comment: ['create', 'update', 'delete'],
  audit: [],
  billing: []
})

export const viewer = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: [],
  project: [],
  task: [],
  label: [],
  comment: [],
  audit: [],
  billing: []
})

export const roles = { owner, admin, member, viewer } as const

export type AppRole = keyof typeof roles
export const APP_ROLES = ['owner', 'admin', 'member', 'viewer'] as const

export const ASSIGNABLE_ROLES = ['admin', 'member', 'viewer'] as const

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value)
}

export type PermissionRequest = {
  [R in keyof typeof statements]?: readonly (typeof statements)[R][number][]
}

//verifica se o role do usuario pode fazer aquela ação
//exemplo: hasPermission('admin', {project: ['create']}) => true
//exemplo: hasPermission('member', {project: ['delete']}) => false
export function hasPermission(
  role: string,
  request: PermissionRequest
): boolean {
  if (!isAppRole(role)) return false

  const target = roles[role] as Role
  return target.authorize(request).success
}
