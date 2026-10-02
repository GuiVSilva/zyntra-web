"use client";

import { Suspense, useState } from "react";
import { Button } from "../ui/button";
import { LayoutGridIcon, ListIcon, PlusIcon } from "lucide-react";
import { cn } from "cn";
import { parseAsBoolean, parseAsStringLiteral, useQueryState } from "nuqs";
import { isRequestLike } from "better-auth";
import { Switch } from "../ui/switch";
import { ProjectClient } from "./project-client";
import { CreateProjectForm } from "./create-project-form";

const PROJECT_VIEW = ["card", "list"] as const;
type ProjectView = (typeof PROJECT_VIEW)[number];

const VIEW_META: Record<ProjectView, { label: string; Icon: typeof ListIcon }> =
  {
    card: { label: "Card", Icon: LayoutGridIcon },
    list: { label: "List", Icon: ListIcon },
  };

export const ProjectView = ({ orgSlug }: { orgSlug: string }) => {
  const [creating, setCreating] = useState(false);

  const [view, setView] = useQueryState(
    "pview",
    parseAsStringLiteral(PROJECT_VIEW)
      .withDefault("card")
      .withOptions({ history: "replace" }),
  );

  const [includeArchived, setIncludeArchived] = useQueryState(
    "archived",
    parseAsBoolean.withDefault(false).withOptions({ history: "replace" }),
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-5 pb-4">
        <div className="bg-muted inline-flex shrink-0 items-center gap-0.5 rounded-lg p-0.5">
          {PROJECT_VIEW.map((el) => {
            const { label, Icon } = VIEW_META[el];
            const isActive = view === el;

            return (
              <button
                key={el}
                type="button"
                role="radio"
                onClick={() => void setView(el)}
                className={cn(
                  "focus-visible:ring-ring inline-flex font-stretch-ultra-condensed gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  isActive
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm">
          <Switch
            checked={includeArchived}
            onCheckedChange={(check) => void setIncludeArchived(check)}
          />{" "}
          Show archived
        </label>

        <span className="flex-1" />

        <Button size="sm" onClick={() => setCreating(true)}>
          <PlusIcon className="size-4" />
          New Project
        </Button>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <ProjectClient
          includeArchived={includeArchived}
          orgSlug={orgSlug}
          onCreate={() => {}}
          view={view}
        />
      </Suspense>

      <CreateProjectForm
        orgSlug={orgSlug}
        open={creating}
        onOpenChange={setCreating}
      />
    </>
  );
};