import { requireActiveOrganization } from "@/lib/authentication";
import React from "react";
import * as organizationService from "@/server/services/organization";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-shell/app-sidebar";

const AppLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) => {
  const { orgSlug } = await params;

  const { session, organization } = await requireActiveOrganization(
    orgSlug,
    `/${orgSlug}`,
  );

  const organizations = await organizationService.listForUser({
    session,
    userId: session.user.id,
  });

  return (
    <SidebarProvider>
      <AppSidebar
        organizations={organizations}
        activeOrgId={organization.id}
        orgSlug={organization.slug}
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image ?? null,
        }}
      />

      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
};

export default AppLayout;