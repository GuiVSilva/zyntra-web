"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  ColorPicker,
  IconPicker,
} from "@/components/project/project-appearance-picker";
import { VisibilityField } from "@/components/project/visibility-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ProjectVisibility } from "@/generated/prisma/enums";
import {
  DEFAULT_PROJECT_COLOR,
  DEFAULT_PROJECT_ICON,
  isProjectColor,
  isProjectIcon,
  type ProjectColor,
  type ProjectIcon,
} from "@/lib/project-appearance";
import { useTRPC } from "@/trpc/client";
import type { ProjectDetail } from "@/trpc/types";

export function ProjectSettingsForm({ project }: { project: ProjectDetail }) {
  const trpc = useTRPC();
  const router = useRouter();
  const canUpdate = true;

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [color, setColor] = useState<ProjectColor>(
    isProjectColor(project.color) ? project.color : DEFAULT_PROJECT_COLOR,
  );
  const [icon, setIcon] = useState<ProjectIcon>(
    isProjectIcon(project.icon) ? project.icon : DEFAULT_PROJECT_ICON,
  );
  const [visibility, setVisibility] = useState<ProjectVisibility>(
    project.visibility,
  );

  const update = useMutation(
    trpc.project.update.mutationOptions({
      onSuccess: () => {
        toast.success("Project updated");
        router.refresh();
      },
      onError: (error) =>
        toast.error("Those changes were not saved", {
          description:
            error.data?.code === "FORBIDDEN"
              ? "Your role does not allow editing this project."
              : error.message,
        }),
    }),
  );

  const trimmed = name.trim();
  const isDirty =
    trimmed !== project.name ||
    description.trim() !== (project.description ?? "") ||
    color !== project.color ||
    icon !== project.icon ||
    visibility !== project.visibility;

  return (
    <Card>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!trimmed || !isDirty) return;
          update.mutate({
            projectId: project.id,
            name: trimmed,
            description: description.trim() || null,
            color,
            icon,
            visibility,
          });
        }}
      >
        <CardHeader>
          <CardTitle>Project</CardTitle>
          <CardDescription>
            The name, look and visibility of this project.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="settings-name">Name</FieldLabel>
            <Input
              id="settings-name"
              required
              maxLength={120}
              disabled={!canUpdate}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="settings-description">Description</FieldLabel>
            <Textarea
              id="settings-description"
              rows={3}
              maxLength={2000}
              disabled={!canUpdate}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel>Colour</FieldLabel>
            <ColorPicker
              value={color}
              onChange={setColor}
              disabled={!canUpdate}
            />
          </Field>

          <Field>
            <FieldLabel>Icon</FieldLabel>
            <IconPicker
              value={icon}
              color={color}
              onChange={setIcon}
              disabled={!canUpdate}
            />
          </Field>

          <VisibilityField
            value={visibility}
            onChange={setVisibility}
            disabled={!canUpdate}
          />
        </CardContent>

        {canUpdate ? (
          <CardFooter className="gap-2">
            <Button
              type="submit"
              disabled={!trimmed || !isDirty || update.isPending}
            >
              {update.isPending ? <Spinner className="size-4" /> : null}
              Save changes
            </Button>
            {isDirty ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setName(project.name);
                  setDescription(project.description ?? "");
                  setColor(
                    isProjectColor(project.color)
                      ? project.color
                      : DEFAULT_PROJECT_COLOR,
                  );
                  setIcon(
                    isProjectIcon(project.icon)
                      ? project.icon
                      : DEFAULT_PROJECT_ICON,
                  );
                  setVisibility(project.visibility);
                }}
              >
                Discard
              </Button>
            ) : null}
          </CardFooter>
        ) : null}
      </form>
    </Card>
  );
}