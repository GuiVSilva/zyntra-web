"use client";

import { StatusCategory } from "@/generated/prisma/enums";
import { TokenColor } from "@/lib/token-colors";
import { WorkflowStatusRow } from "@/server/services/workflow.service";
import { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { cn } from "cn";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  GripVerticalIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { ColorPicker } from "./status-settings/color-picker";
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
import { Button } from "../ui/button";

interface CardProps {
  status: WorkflowStatusRow;
  index: number;
  count: number;
  canEdit: boolean;
  isBusy: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  isDragging?: boolean;
  onRename: (name: string) => void;
  onRecolour: (color: TokenColor) => void;
  onRecategorise: (category: StatusCategory) => void;
  onMove: (from: number, to: number) => void;
  onDelete: () => void;
}

export const StatusRow = ({
  status,
  index,
  count,
  canEdit,
  isBusy,
  dragHandleProps,
  isDragging,
  onRename,
  onRecolour,
  onRecategorise,
  onMove,
  onDelete,
}: CardProps) => {
  const [draft, setDraft] = useState(status.name);

  function commit() {
    const next = draft.trim();

    if (!next || next === status.name) {
      setDraft(status.name);
      return;
    }
    onRename(next);
  }

  return (
    <div
      className={cn(
        "bg-card flex flex-wrap items-center gap-2 rounded-lg border p-2",
        isDragging && "border-primary/40 shadow-md",
      )}
    >
      {canEdit ? (
        <span className="text-muted-foreground/50 hover:text-muted-foreground hidden cursor-pointer sm:block">
          <GripVerticalIcon className="size-4" />
        </span>
      ) : null}

      <ColorPicker
        value={status.color}
        onChange={onRecolour}
        disabled={!canEdit || isBusy}
        label={`Colour  for ${status.name}`}
      />

      <Input
        value={draft}
        disabled={!canEdit || isBusy}
        maxLength={40}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }

          if (event.key === "Escape") {
            setDraft(status.name);
            event.currentTarget.blur();
          }
        }}
        className="h-9 min-w-32 flex-1"
      />

      <Select
        value={status.category}
        disabled={!canEdit || isBusy}
        onValueChange={(value) => onRecategorise(value as StatusCategory)}
      >
        <SelectTrigger className="h-9 w-full sm:w-36">
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          {STATUS_CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {STATUS_CATEGORY_META[cat].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span
        className="text-muted-foreground w-14 shrink-0 text-right font-mono text-xs tabular-nums"
        title={`${status.taskCount} tasks`}
      >
        {status.taskCount}
      </span>

      {canEdit ? (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            disabled={index === 0 || isBusy}
            aria-label={`Move ${status.name} left`}
            onClick={() => onMove(index, index - 1)}
          >
            <ChevronUpIcon className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            disabled={index === count - 1 || isBusy}
            aria-label={`Move ${status.name} right`}
            onClick={() => onMove(index, index + 1)}
          >
            <ChevronDownIcon className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-11"
            disabled={isBusy}
            aria-label={`Delete the ${status.name} column`}
            onClick={onDelete}
          >
            <Trash2Icon className="size-4" aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );
};