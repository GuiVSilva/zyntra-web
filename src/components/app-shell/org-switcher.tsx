'use client'

import { useRouter } from 'next/navigation'
import { OrganizationOption } from './app-sidebar'
import { useState } from 'react'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from 'cn'
import { ChevronsUpDownIcon } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import type { AppRole } from '@/lib/permissions'
import { toast } from 'sonner'
import { Spinner } from '../ui/spinner'

export const roleLabels: Record<AppRole, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  member: 'Membro',
  viewer: 'Leitor'
}

const translateRole = (role: string) =>
  Object.hasOwn(roleLabels, role) ? roleLabels[role as AppRole] : role

export const OrgSwitcher = ({
  organizations,
  activeId
}: {
  organizations: OrganizationOption[]
  activeId: string
}) => {
  const router = useRouter()
  const [switchingTo, setSwitchingTo] = useState<string | null>(null)

  const active =
    organizations.find(organization => organization.id === activeId) ??
    organizations[0]

  if (!active) return null

  const switchTo = async (org: OrganizationOption) => {
    if (org.id === active.id) return

    setSwitchingTo(org.id)

    const { error } = await authClient.organization.setActive({
      organizationId: org.id
    })

    if (error) {
      setSwitchingTo(null)
      toast.error(`Não foi possivel alterar para ${org.name}`)
      return
    }

    router.push(`/${org.slug}`)
    // Server Components hold the previous organization's data until this runs.
    router.refresh()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent"
            >
              <OrgAvatar name={active.name} />
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-semibold text-sm">
                  {active.name}
                </span>
                <span className="text-muted-foreground truncate text-xs caret-input">
                  {translateRole(active.role)}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent>
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organização
            </DropdownMenuLabel>

            {organizations?.map(org => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => switchTo(org)}
                disabled={switchingTo !== null}
                className="gap-2"
              >
                <OrgAvatar name={org.name} className="size-6 text-xs" />
                <span className="flex-1 truncate">{org.name}</span>

                {switchingTo === org.id ? (
                  <Spinner className="size-3.5" />
                ) : org.id === active.id ? (
                  <span
                    aria-hidden
                    className="bg-primary size-1.5 shrink-0 rounded-full"
                  />
                ) : null}
                {org.id === active.id ? (
                  <span className="sr-only">Organização atual</span>
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function OrgAvatar({
  name,
  className
}: {
  name: string
  className?: string
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0] ?? '')
    .join('')
    .toUpperCase()

  return (
    <span
      aria-hidden
      className={cn(
        'bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold',
        className
      )}
    >
      {initials}
    </span>
  )
}
