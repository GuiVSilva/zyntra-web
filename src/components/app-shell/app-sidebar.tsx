'use client'

import { useTRPC } from '@/trpc/client'
import {
  CalendarDaysIcon,
  CheckSquareIcon,
  FolderKanbanIcon,
  InboxIcon,
  LayoutDashboardIcon,
  SearchIcon,
  SettingsIcon
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator
} from '../ui/sidebar'
import Link from 'next/link'
import { OrgSwitcher } from './org-switcher'

export type OrganizationOption = {
  id: string
  name: string
  slug: string
  role: string
  memberCount: number
}

export type ShellUser = {
  name: string
  email: string
  image: string | null
}

type AppSidebarType = {
  organizations: OrganizationOption[]
  activeOrgId: string
  orgSlug: string
  user: ShellUser
}
export const AppSidebar = ({
  activeOrgId,
  orgSlug,
  organizations,
  user
}: AppSidebarType) => {
  const pathname = usePathname()
  const trpc = useTRPC()

  // TODO: fetch projects

  const items = [
    {
      href: `/${orgSlug}`,
      label: 'Dashboard',
      Icon: LayoutDashboardIcon,
      exact: true
    },
    { href: `/${orgSlug}/projects`, label: 'Projetos', Icon: FolderKanbanIcon },
    {
      href: `/${orgSlug}/my-tasks`,
      label: 'Minhas Tarefas',
      Icon: CheckSquareIcon
    },
    {
      href: `/${orgSlug}/calendar`,
      label: 'Calendário',
      Icon: CalendarDaysIcon
    },
    {
      href: `/${orgSlug}/inbox`,
      label: 'Caixa de Entrada',
      Icon: InboxIcon,
      badge: 10
    },
    { href: `/${orgSlug}/settings`, label: 'Configurações', Icon: SettingsIcon }
  ]

  const isActive = (href: string, exact = false) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <OrgSwitcher organizations={organizations} activeId={activeOrgId} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="bg-background">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <SearchIcon aria-hidden />
                  <span>Buscar</span>
                  <kbd className="bg-sidebar-accent text-muted-foreground ml-auto rounded px-1.5 py-0.5 font-mono text-[10px] group-data-[collapsible=icon]:hidden">
                    ⌘ K
                  </kbd>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map(({ href, label, Icon, badge, exact }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild>
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>

                  {badge ? (
                    <SidebarMenuBadge
                      aria-label={`${badge} unread`}
                      className="bg-destructive text-destructive-foreground"
                    >
                      {badge > 99 ? '99+' : badge}
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* PROJECTS */}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
