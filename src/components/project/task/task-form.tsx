"use client";

import { AssigneeSelect } from "@/components/organization/assignee-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { TaskPriority } from "@/generated/prisma/enums";
import { TASK_PRIORITIES, TASK_PRIORITY_META } from "@/lib/task-view-state";
import { useTRPC } from "@/trpc/client";
import { WorkflowStatusRow } from "@/trpc/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DateField } from "./date-field";
import { StatusDot } from "./task-badges";

export function CreateTaskDialog({
  projectId,
  statuses,
  open,
  onOpenChange,
  defaultStatusId,
}: {
  projectId: string;
  /** The project's columns, in board order. */
  statuses: WorkflowStatusRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatusId: string;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState<string>(defaultStatusId);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);

  const create = useMutation(
    trpc.task.create.mutationOptions({
      onSuccess: (task) => {
        toast.success(`"${task.title}" added`);
        reset();
        onOpenChange(false);
        // The command menu's search reads a query the client owns outright, so
        // that one is safe to invalidate; the board is refreshed below.
        void queryClient.invalidateQueries({
          queryKey: trpc.task.list.pathKey(),
          refetchType: "none",
        });
        router.refresh();
      },
      onError: (error) => {
        console.log(error);
        toast.error("That task could not be created", {
          description:
            error.data?.code === "FORBIDDEN"
              ? "Your role does not allow creating tasks."
              : error.message,
        });
      },
    }),
  );

  function reset() {
    setTitle("");
    setDescription("");
    setPriority(TaskPriority.MEDIUM);
    setAssigneeId(null);
    setDueDate(null);
  }

  const trimmed = title.trim();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmed) return;
    create.mutate({
      projectId,
      title: trimmed,
      description: description.trim() || null,
      statusId,
      priority,
      assigneeId,
      dueDate,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-lg">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>
              A title is all it needs. Everything else can be filled in later.
            </DialogDescription>
          </DialogHeader>

          {/* Scrolls, so the submit button stays reachable at any viewport
              height — the description editor grows with what is typed into
              it. Same treatment as the new-project dialog. */}
          <div className="-mx-1 grid min-h-0 flex-1 gap-4 overflow-y-auto px-1 py-4">
            <Field>
              <FieldLabel htmlFor="task-title">Title</FieldLabel>
              <Input
                id="task-title"
                autoFocus
                required
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What needs doing?"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="task-description">Description</FieldLabel>
              <Textarea
                id="task-description"
                rows={3}
                maxLength={10_000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Anything worth knowing before starting."
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="task-status">Column</FieldLabel>
                <Select value={statusId} onValueChange={setStatusId}>
                  <SelectTrigger id="task-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        <span className="flex items-center gap-2">
                          <StatusDot status={option} />
                          {option.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="task-priority">Priority</FieldLabel>
                <Select
                  value={priority}
                  onValueChange={(next) => setPriority(next as TaskPriority)}
                >
                  <SelectTrigger id="task-priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {TASK_PRIORITY_META[value].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="task-assignee">Assignee</FieldLabel>
                <AssigneeSelect
                  id="task-assignee"
                  value={assigneeId}
                  onChange={setAssigneeId}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="task-due">Due date</FieldLabel>
                <DateField
                  id="task-due"
                  label="Due date"
                  value={dueDate}
                  onChange={setDueDate}
                />
              </Field>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmed || create.isPending}>
              {create.isPending ? <Spinner className="size-4" /> : null}
              {create.isPending ? "Adding…" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}