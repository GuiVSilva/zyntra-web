"use client";

import { WorkflowStatusRow } from "@/server/services/workflow.service";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { cn } from "cn";
import { toast } from "sonner";
import { StatusRow } from "./statustus-row";
import { StatusCategory } from "@/generated/prisma/enums";
import { DEFAULT_TOKEN_COLOR, TokenColor } from "@/lib/token-colors";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  STATUS_CATEGORIES,
  STATUS_CATEGORY_META,
} from "@/lib/workflow-statues";
import { Spinner } from "../ui/spinner";
import { PlusIcon } from "lucide-react";
import { ColorPicker } from "./status-settings/color-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const VISIBLE_COLUMNS = 7;

export const ProjectSettingsCard = ({ projectId }: { projectId: string }) => {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canEdit = true;

  const listKey = trpc.workflow.list.queryKey({ projectId });

  const statuses = useQuery(trpc.workflow.list.queryOptions({ projectId }));

  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<WorkflowStatusRow | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function optimistically(
    next: (rows: WorkflowStatusRow[]) => WorkflowStatusRow[],
  ) {
    const previous = queryClient.getQueryData<WorkflowStatusRow[]>(listKey);
    if (previous) queryClient.setQueryData(listKey, next(previous));

    return () => {
      if (previous) queryClient.setQueryData(listKey, previous);
    };
  }

  const update = useMutation(
    trpc.workflow.update.mutationOptions({
      onError: (error) => {
        void statuses.refetch();
        toast.error("That column was not changed", {
          description:
            error.data?.code === "FORBIDDEN"
              ? "Your role does not allow editing this project."
              : error.message,
        });
      },
      onSuccess: () => router.refresh(),
    }),
  );

  const reorder = useMutation(
    trpc.workflow.reorder.mutationOptions({
      onError: (error) => {
        void statuses.refetch();
        toast.error("The columns were put back", {
          description:
            error.data?.code === "FORBIDDEN"
              ? "Your role does not allow editing this project."
              : error.message,
        });
      },
      onSuccess: () => router.refresh(),
    }),
  );

  const create = useMutation(
    trpc.workflow.create.mutationOptions({
      onSuccess: (created) => {
        toast.success(`"${created.name}" added`);
        setAdding(false);
        void queryClient.invalidateQueries({ queryKey: listKey });
        router.refresh();
      },
      onError: (error) => {
        toast.error("That column was not added", {
          description: error.message,
        });
      },
    }),
  );

  const remove = useMutation(
    trpc.workflow.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Column deleted");
        setPendingDelete(null);
        setDeleteError(null);
        void queryClient.invalidateQueries({ queryKey: listKey });
        router.refresh();
      },
      onError: (error) => {
        // Rendered inside the dialog rather than as a toast. The message names
        // how many tasks are in the way, and that number belongs next to the
        // button that was just pressed — not in a corner of the screen the
        // reader has to go looking for.
        setDeleteError(error.message);
      },
    }),
  );

  const rows = statuses.data ?? [];
  const isBusy = update.isPending || reorder.isPending || remove.isPending;

  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= rows.length) return;

    const next = [...rows];
    const [moved] = next.splice(from, 1);

    if (!moved) return;
    next.splice(to, 0, moved);

    const rollback = optimistically(() =>
      next.map((status, index) => ({ ...status, position: index })),
    );

    reorder.mutate(
      {
        projectId,
        statusIds: next.map((status) => status.id),
      },
      { onError: rollback },
    );
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    moveTo(result.source.index, result.destination.index);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Board columns</CardTitle>
        <CardDescription>
          Renaming a column changes it everywhere this board appears. What a
          column <em>means</em> — not started, in flight, done — is what My
          Tasks and the completed filter read, so a renamed column keeps
          counting.
        </CardDescription>
        {rows.length > 0 ? (
          <CardAction>
            <Badge variant="secondary">
              {rows.length === 1 ? "1 column" : `${rows.length} columns`}
            </Badge>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="grid gap-3">
        {statuses.isPending ? (
          <div
            role="status"
            aria-label="Loading the columns"
            className="grid gap-2"
          >
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : statuses.isError ? (
          <Alert variant="destructive">
            <AlertTitle>The columns could not be loaded</AlertTitle>
            <AlertDescription className="grid gap-2">
              <span>{statuses.error.message}</span>
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => void statuses.refetch()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            This board has no columns yet.
          </p>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="statuses">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "grid gap-2",
                    // Past a boardful of columns the list scrolls instead of
                    // growing the page — Archive and Delete stay reachable
                    // without a long scroll past twenty rows of column editor.
                    // The droppable is the scroll container itself, which is
                    // what @hello-pangea/dnd auto-scrolls during a drag.
                    rows.length > VISIBLE_COLUMNS &&
                      "max-h-[26rem] overflow-y-auto pr-1",
                  )}
                >
                  {rows.map((status, index) => (
                    <Draggable
                      key={status.id}
                      draggableId={status.id}
                      index={index}
                      isDragDisabled={!canEdit || isBusy}
                    >
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                        >
                          <StatusRow
                            status={status}
                            index={index}
                            count={rows.length}
                            canEdit={canEdit}
                            isBusy={isBusy}
                            dragHandleProps={dragProvided.dragHandleProps}
                            isDragging={dragSnapshot.isDragging}
                            onRename={(name) => {
                              const rollback = optimistically((current) =>
                                current.map((row) =>
                                  row.id === status.id ? { ...row, name } : row,
                                ),
                              );
                              update.mutate(
                                { projectId, statusId: status.id, name },
                                { onError: rollback },
                              );
                            }}
                            onRecolour={(color) => {
                              const rollback = optimistically((current) =>
                                current.map((row) =>
                                  row.id === status.id
                                    ? { ...row, color }
                                    : row,
                                ),
                              );
                              update.mutate(
                                { projectId, statusId: status.id, color },
                                { onError: rollback },
                              );
                            }}
                            onRecategorise={(category) => {
                              const rollback = optimistically((current) =>
                                current.map((row) =>
                                  row.id === status.id
                                    ? { ...row, category }
                                    : row,
                                ),
                              );
                              update.mutate(
                                { projectId, statusId: status.id, category },
                                { onError: rollback },
                              );
                            }}
                            onMove={moveTo}
                            onDelete={() => {
                              setDeleteError(null);
                              setPendingDelete(status);
                            }}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {canEdit ? (
          adding ? (
            <NewStatusForm
              busy={create.isPending}
              onCreate={(input) => create.mutate({ projectId, ...input })}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setAdding(true)}
              disabled={statuses.isPending || statuses.isError}
            >
              <PlusIcon className="size-4" aria-hidden />
              Add column
            </Button>
          )
        ) : (
          <p className="text-muted-foreground text-xs">
            Your role does not allow changing this project&apos;s columns.
          </p>
        )}
      </CardContent>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{pendingDelete?.name}”?</DialogTitle>
            <DialogDescription>
              The column is removed from this board. Tasks are never deleted —
              move them to another column first.
            </DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <Alert variant="destructive">
              <AlertTitle>Not yet</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingDelete(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => {
                if (!pendingDelete) return;
                remove.mutate({ projectId, statusId: pendingDelete.id });
              }}
            >
              {remove.isPending ? <Spinner /> : null}
              Delete column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const NewStatusForm = ({
  onCancel,
  onCreate,
  busy,
}: {
  onCancel: () => void;
  onCreate: (input: {
    name: string;
    color: string;
    category: StatusCategory;
  }) => void;
  busy: boolean;
}) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState<TokenColor>(DEFAULT_TOKEN_COLOR);
  const [category, setCategory] = useState<StatusCategory>(StatusCategory.TODO);

  const trimmed = name.trim();

  return (
    <form
      className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!trimmed) return;
        onCreate({ name: trimmed, color, category });
      }}
    >
      <ColorPicker
        value={color}
        onChange={setColor}
        disabled={busy}
        label="Colour for the new column"
      />

      <Input
        autoFocus
        value={name}
        maxLength={40}
        disabled={busy}
        aria-label="Name of the new column"
        placeholder="Waiting on legal"
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
        className="h-9 min-w-32 flex-1"
      />

      <Select
        value={category}
        disabled={busy}
        onValueChange={(next) => setCategory(next as StatusCategory)}
      >
        <SelectTrigger
          className="h-9 w-full sm:w-36"
          aria-label="What it means"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_CATEGORIES.map((value) => (
            <SelectItem key={value} value={value}>
              {STATUS_CATEGORY_META[value].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex shrink-0 items-center gap-1">
        <Button type="submit" size="sm" disabled={busy || !trimmed}>
          {busy ? <Spinner /> : null}
          Add
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};