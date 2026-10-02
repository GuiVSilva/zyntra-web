import { requireActiveOrganization } from "@/lib/authentication";
import * as projectService from "@/server/services/project.service";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-shell/app-header";
import { ProjectSettingsForm } from "@/components/project/project-settings-form";
import { HydrateClient } from "@/trpc/server";
import { ProjectSettingsCard } from "@/components/project/project-settings-card";

const ProjectSettings = async ({
  params,
}: {
  params: Promise<{ orgSlug: string; projectId: string }>;
}) => {
  const { orgSlug, projectId } = await params;
  const { organization, ctx } = await requireActiveOrganization(
    orgSlug,
    `/${orgSlug}/projects/${projectId}/settings`,
  );
  const project = await projectService
    .byId(ctx, { projectId })
    .catch(() => null);

  if (!project) notFound();

  return (
    <>
      <AppHeader
        crumbs={[
          { label: organization.name, href: `/${orgSlug}` },
          { label: "Projects", href: `/${orgSlug}/projects` },
          { label: project.name, href: `/${orgSlug}/projects/${projectId}` },
          { label: "Settings" },
        ]}
      />

      <main className="flex flex-1 flex-col p-4 md:p-6">
        <div className="mx-auto grid w-full max-w-2xl gap-6">
          <header className="grid gap-1">
            <h1 className="text-xl font-semibold tracking-tight">
              Project Settings
            </h1>
            <p className="text-muted-foreground text-sm">
              How {project.name} looks, who can reach it, and what its board is
              made of.
            </p>
          </header>

          <ProjectSettingsForm project={project} />

          <HydrateClient>
            <ProjectSettingsCard projectId={projectId} />
          </HydrateClient>
        </div>
      </main>
    </>
  );
};

export default ProjectSettings;