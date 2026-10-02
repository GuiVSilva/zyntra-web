"use client";

import { ProjectVisibility } from "@/generated/prisma/enums";
import {
  DEFAULT_PROJECT_COLOR,
  DEFAULT_PROJECT_ICON,
  ProjectColor,
  ProjectIcon,
} from "@/lib/project-appearance";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Field, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { ColorPicker, IconPicker } from "./project-appearance-picker";
import { VisibilityField } from "./visibility-field";
import { Button } from "../ui/button";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Spinner } from "../ui/spinner";

export const CreateProjectForm = ({
  orgSlug,
  open,
  onOpenChange,
}: {
  orgSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const trpc = useTRPC();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<ProjectColor>(DEFAULT_PROJECT_COLOR);
  const [icon, setIcon] = useState<ProjectIcon>(DEFAULT_PROJECT_ICON);
  const [visibility, setVisibility] = useState<ProjectVisibility>(
    ProjectVisibility.OPEN,
  );

  function reset() {
    setName("");
    setDescription("");
    setColor(DEFAULT_PROJECT_COLOR);
    setIcon(DEFAULT_PROJECT_ICON);
    setVisibility(ProjectVisibility.OPEN);
  }

  const create = useMutation(
    trpc.project.create.mutationOptions({
      onSuccess: (project) => {
        toast.success(`${project.name} created`);
        onOpenChange(false);
        reset();
        router.push(`/${orgSlug}/projects/${project.id}`);
        router.refresh();
      },
      onError: (error) =>
        toast.error("That project could not be created", {
          description:
            error.data?.code === "FORBIDDEN"
              ? "Your role does not allow creating projects."
              : error.message,
        }),
    }),
  );

  const trimmed = name.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-lg">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!trimmed) return;
            create.mutate({
              name: trimmed,
              description: description.trim() || null,
              color,
              icon,
              visibility,
            });
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Projects hold tasks and give the board, list and calendar
              something to show.
            </DialogDescription>
          </DialogHeader>

          <div className="-mx-1 grid min-h-0 flex-1 gap-4 overflow-y-auto px-1 py-4">
            <Field>
              <FieldLabel htmlFor="project-name">Name</FieldLabel>
              <Input
                id="project-name"
                autoFocus
                required
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Website redesign"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="project-description">Description</FieldLabel>
              <Textarea
                id="project-description"
                rows={2}
                maxLength={2000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What this project is for."
              />
            </Field>

            <Field>
              <FieldLabel>Colour</FieldLabel>
              <ColorPicker value={color} onChange={setColor} />
            </Field>

            <Field>
              <FieldLabel>Icon</FieldLabel>
              <IconPicker value={icon} color={color} onChange={setIcon} />
            </Field>

            <VisibilityField value={visibility} onChange={setVisibility} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Spinner className="size-4" />}
              {create.isPending ? "creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};