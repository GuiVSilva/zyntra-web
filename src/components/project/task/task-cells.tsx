"use client";

import { formatDate } from "@/lib/format";
import { TaskSummary } from "@/trpc/types";
import { cn } from "cn";
import { ProjectGlyph } from "../project-client";
import {
  AssigneeAvatar,
  DueDate,
  LabelPill,
  PriorityGlyph,
  SubtaskCount,
} from "./task-badges";

export function TaskTitleCell({
  task,
  onOpen,
  className,
}: {
  task: TaskSummary;
  onOpen: (taskId: string) => void;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <PriorityGlyph priority={task.priority} />
      <button
        type="button"
        onClick={(event) => {
          // The row handles this too; letting it bubble would open the sheet
          // twice.
          event.stopPropagation();
          onOpen(task.id);
        }}
        className="focus-visible:ring-ring hover:text-primary min-w-0 truncate rounded text-left font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {task.title}
      </button>
      <SubtaskCount
        done={task.subtaskCount.done}
        total={task.subtaskCount.total}
      />
      {task.labels.length > 0 ? (
        <span className="hidden shrink-0 items-center gap-1 lg:flex">
          {/* Two, then a count. Six label pills in a table cell push the title
              out of the row; the rest are one click away in the sheet. */}
          {task.labels.slice(0, 2).map((label) => (
            <LabelPill key={label.id} label={label} />
          ))}
          {task.labels.length > 2 ? (
            <span className="text-muted-foreground text-[11px] tabular-nums">
              +{task.labels.length - 2}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

export function ProjectCell({ task }: { task: TaskSummary }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <ProjectGlyph
        color={task.project.color}
        icon={task.project.icon}
        size="sm"
      />
      <span className="truncate">{task.project.name}</span>
    </span>
  );
}

export function AssigneeCell({ task }: { task: TaskSummary }) {
  if (!task.assignee) {
    return <span className="text-muted-foreground">Unassigned</span>;
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <AssigneeAvatar
        name={task.assignee.name}
        image={task.assignee.image}
        className="size-5"
      />
      <span className="truncate">{task.assignee.name}</span>
    </span>
  );
}

export function DueCell({ task, today }: { task: TaskSummary; today: Date }) {
  if (!task.dueDate) {
    return <span className="text-muted-foreground">—</span>;
  }
  return <DueDate date={task.dueDate} today={today} withIcon={false} />;
}

export function StartCell({ task }: { task: TaskSummary }) {
  return (
    <span className="text-muted-foreground">
      {task.startDate ? formatDate(task.startDate) : "—"}
    </span>
  );
}