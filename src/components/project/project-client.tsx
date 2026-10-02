"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { ArrowRightIcon, FolderKanbanIcon } from "lucide-react";
import { Button } from "../ui/button";
import { nextCursor } from "@/lib/task.queries";
import { ProjectSummary } from "@/trpc/types";
import Link from "next/link";
import {
  PROJECT_ICON_COMPONENTS,
  projectColorClasses,
  projectIconKey,
} from "@/lib/project-appearance";
import { cn } from "cn";

export const ProjectClient = ({
  orgSlug,
  view,
  includeArchived,
  onCreate,
}: {
  orgSlug: string;
  view: "card" | "list";
  includeArchived: boolean;
  onCreate: () => void;
}) => {
  const trpc = useTRPC();

  const query = useSuspenseInfiniteQuery(
    trpc.project.list.infiniteQueryOptions(
      { includeArchived, limit: 50 },
      { getNextPageParam: nextCursor },
    ),
  );

  const projects = query.data.pages.flatMap((page) => page.items);

  if (projects.length === 0) {
    return (
      <Empty className="flex-1 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderKanbanIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle>
            {includeArchived ? "No projects at all yet" : "No active projects"}
          </EmptyTitle>
          <EmptyDescription>
            {includeArchived
              ? "A project holds your team's tasks and keeps the board, list and calendar in sync."
              : "Everything here has been archived. Show archived projects to bring one back."}
          </EmptyDescription>
        </EmptyHeader>
        {includeArchived ? (
          <EmptyContent>
            <Button onClick={onCreate}>Create a project</Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {view === "card" ? (
        <CardView orgSlug={orgSlug} projects={projects} />
      ) : null}
    </div>
  );
};

const CardView = ({
  orgSlug,
  projects,
}: {
  orgSlug: string;
  projects: ProjectSummary[];
}) => {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/${orgSlug}/projects/${project.id}`}
            className="group bg-card focus-visible:ring-ring hover:border-primary/40 relative flex h-full flex-col rounded-xl border p-4 shadow-xs "
          >
            <div className="flex items-start gap-3">
              <ProjectGlyph
                color={project.color}
                icon={project.icon}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium">{project.name}</h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  <TaskCount count={project.taskCount.tasks} />
                </p>
              </div>

              <ArrowRightIcon className="text-muted-foreground size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100:" />
            </div>

            {project.description ? (
              <p className="text-muted-foreground mt-4 line-clamp-2 text-xs leading-5">
                {project.description}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export function ProjectGlyph({
  color,
  icon,
  size = "md",
  className,
}: {
  color: string;
  icon: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = PROJECT_ICON_COMPONENTS[projectIconKey(icon)];
  const { text } = projectColorClasses(color);

  return (
    <span
      aria-hidden
      className={cn(
        // The tint is `currentColor` at low alpha, so the square and the glyph
        // cannot drift apart when a colour token moves.
        "inline-flex shrink-0 items-center justify-center rounded-md bg-current/12",
        text,
        size === "sm" && "size-5",
        size === "md" && "size-7",
        size === "lg" && "size-9",
        className,
      )}
    >
      <Icon
        className={cn(
          size === "sm" && "size-3",
          size === "md" && "size-4",
          size === "lg" && "size-5",
        )}
      />
    </span>
  );
}

function TaskCount({ count }: { count: number }) {
  if (count === 0) return <>No tasks yet</>;
  return (
    <>
      {count} {count === 1 ? "task" : "tasks"}
    </>
  );
}