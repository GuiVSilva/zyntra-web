import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { TaskPriority } from "@/generated/prisma/enums";
import { formatDate, formatDayMonth } from "@/lib/format";
import { TASK_PRIORITY_META } from "@/lib/task-view-state";
import { tokenColorClasses } from "@/lib/token-colors";
import { cn } from "@/lib/utils";
import { CalendarIcon, ListChecksIcon } from "lucide-react";

/**
 * What the status glyphs need. Structural rather than the router's row type,
 * because these render from a card, from a filter menu and from the settings
 * screen — three shapes that all carry a name and a colour and differ elsewhere.
 */
export type StatusLike = { name: string; color: string };

/**
 * The small, repeated task glyphs. Server Components — none of them holds state.
 *
 * They live in one file because they are always used together on a card and in
 * a row, and four files of eight lines each is filing, not structure.
 */

/**
 * A status as a monospace-caps pill, the treatment all three references use.
 * It reads at a glance and it scales to six statuses where a coloured word
 * would start competing with the title for attention.
 */
export function StatusPill({
  status,
  className,
}: {
  status: StatusLike;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[10px] leading-4 font-medium tracking-wide uppercase",
        tokenColorClasses(status.color).soft,
        className,
      )}
    >
      {status.name}
    </span>
  );
}

/** The coloured dot in a board column header and beside a status in a menu. */
export function StatusDot({
  status,
  className,
}: {
  status: StatusLike;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-2 shrink-0 rounded-full",
        tokenColorClasses(status.color).bg,
        className,
      )}
    />
  );
}

export function PriorityGlyph({
  priority,
  className,
  showLabel = false,
}: {
  priority: TaskPriority;
  className?: string;
  showLabel?: boolean;
}) {
  const meta = TASK_PRIORITY_META[priority];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-[11px] leading-4",
        meta.color,
        className,
      )}
      title={showLabel ? undefined : `${meta.label} priority`}
    >
      <span className="flex items-end gap-px" aria-hidden>
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={cn(
              "w-[3px] rounded-[1px] bg-current",
              bar === 1 && "h-1.5",
              bar === 2 && "h-2",
              bar === 3 && "h-2.5",
              bar > meta.bars && "opacity-25",
            )}
          />
        ))}
      </span>
      <span className={showLabel ? undefined : "sr-only"}>
        {meta.label}
        {showLabel ? "" : " priority"}
      </span>
    </span>
  );
}

export function SubtaskCount({
  done,
  total,
  className,
}: {
  done: number;
  total: number;
  className?: string;
}) {
  if (total === 0) return null;

  return (
    <span
      className={cn(
        "text-muted-foreground inline-flex shrink-0 items-center gap-1 text-[11px] leading-4",
        // Finished checklists earn the same green a done column gets, so a
        // card that is only waiting on itself reads at a glance.
        done === total && "text-success",
        className,
      )}
      title={`${done} of ${total} subtasks done`}
    >
      <ListChecksIcon className="size-3.5" aria-hidden />
      <span className="font-mono tabular-nums">
        {done}/{total}
      </span>
      <span className="sr-only">subtasks complete</span>
    </span>
  );
}

export function LabelPill({
  label,
  className,
}: {
  label: { name: string; color: string };
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center truncate rounded px-2 py-0.5 text-[11px] leading-4 font-medium",
        tokenColorClasses(label.color).soft,
        className,
      )}
    >
      {label.name}
    </span>
  );
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = Array.from(words[0])[0] ?? "";
  const last =
    words.length > 1 ? (Array.from(words.at(-1) ?? "")[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function AssigneeAvatar({
  name,
  image,
  className,
}: {
  name: string;
  image: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-6 shrink-0", className)}>
      {image ? <AvatarImage src={image} alt="" /> : null}
      <AvatarFallback className="text-[10px]">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

export function DueDate({
  date,
  today,
  className,
  withIcon = true,
}: {
  date: Date;
  /** Start of the reader's today, as a UTC-midnight date. */
  today: Date;
  className?: string;
  withIcon?: boolean;
}) {
  const day = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const isOverdue = day < today.getTime();
  const isToday = day === today.getTime();
  const sameYear = date.getUTCFullYear() === today.getUTCFullYear();

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 text-[11px] leading-4",
        isOverdue && "text-destructive font-medium",
        isToday && "text-warning font-medium",
        !isOverdue && !isToday && "text-muted-foreground",
        className,
      )}
      title={
        isOverdue
          ? `Overdue — was due ${formatDate(date)}`
          : isToday
            ? `Due today, ${formatDate(date)}`
            : `Due ${formatDate(date)}`
      }
    >
      {withIcon ? <CalendarIcon className="size-3" aria-hidden /> : null}
      {sameYear ? formatDayMonth(date) : formatDate(date)}
      {isOverdue ? <span className="sr-only"> (overdue)</span> : null}
    </span>
  );
}