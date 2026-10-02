"use client";

import { listViewInput, TaskViewState } from "@/lib/task-view-state";
import { nextCursor } from "@/lib/task.queries";
import { useTRPC } from "@/trpc/client";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  createColumnHelper,
  rowSelectionFeature,
  tableFeatures,
  useTable,
  type RowSelectionState,
} from "@tanstack/react-table";
import { TaskSummary } from "@/trpc/types";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AssigneeCell,
  DueCell,
  ProjectCell,
  StartCell,
  TaskTitleCell,
} from "./task-cells";
import { StatusPill } from "./task-badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "cn";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  ListIcon,
} from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";

export function TaskListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading tasks"
      className="flex-1 px-4 pb-4 md:px-6"
    >
      <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
        <div className="bg-muted/40 h-9 border-b" />
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="flex h-12 items-center gap-3 border-b px-4"
          >
            <div className="bg-muted/60 h-3 w-1/3 animate-pulse rounded" />
            <div className="bg-muted/40 h-3 w-24 animate-pulse rounded" />
            <span className="flex-1" />
            <div className="bg-muted/40 h-4 w-16 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SortButton({
  label,
  active,
  order,
  onClick,
}: {
  label: React.ReactNode;
  active: boolean;
  order: "asc" | "desc";
  onClick: () => void;
}) {
  const Icon = !active
    ? ChevronsUpDownIcon
    : order === "asc"
      ? ArrowUpIcon
      : ArrowDownIcon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-visible:ring-ring -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none",
        active ? "text-foreground" : "hover:text-foreground",
      )}
    >
      {label}
      <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden />
    </button>
  );
}

type SortKey = "title" | "status" | "priority" | "dueDate" | "createdAt";
const features = tableFeatures({ rowSelectionFeature });
const helper = createColumnHelper<typeof features, TaskSummary>();

const SORTABLE: Record<string, SortKey> = {
  title: "title",
  status: "status",
  priority: "priority",
  dueDate: "dueDate",
};
const HIDE_BELOW: Record<string, string> = {
  select: "hidden sm:table-cell",
  project: "hidden lg:table-cell",
  assignee: "hidden md:table-cell",
  startDate: "hidden xl:table-cell",
};

export const TaskList = ({
  onOpenTask,
  projectId,
  today,
  viewState,
}: {
  projectId: string;
  viewState: TaskViewState;
  today: Date;
  onOpenTask: (taskId: string) => void;
}) => {
  const trpc = useTRPC();
  const [sort, setSort] = useState<{
    key: SortKey;
    order: "asc" | "desc";
  }>({ key: "dueDate", order: "asc" });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const query = useSuspenseInfiniteQuery(
    trpc.task.list.infiniteQueryOptions(
      listViewInput(projectId, viewState, {
        sort: sort.key === "status" ? "dueDate" : sort.key,
        order: sort.order,
      }),
      { getNextPageParam: nextCursor },
    ),
  );

  const data = useMemo(
    () => query.data.pages.flatMap((page) => page.items),
    [query.data.pages],
  );

  const total = query.data.pages[0].totalCount ?? 0;

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "select",
          header: ({ table }) => (
            <Checkbox
              aria-label="Select all loaded tasks"
              checked={
                table.getIsAllRowsSelected()
                  ? true
                  : table.getIsSomeRowsSelected()
                    ? "indeterminate"
                    : false
              }
              onCheckedChange={(checked) =>
                table.toggleAllRowsSelected(checked === true)
              }
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              aria-label={`Select ${row.original.title}`}
              checked={row.getIsSelected()}
              onCheckedChange={(checked) =>
                row.toggleSelected(checked === true)
              }
              // Stops the click bubbling to the row, which would open the sheet
              // for the task the user was only trying to tick.
              onClick={(event) => event.stopPropagation()}
            />
          ),
        }),
        helper.accessor("title", {
          header: "Task",
          cell: ({ row }) => (
            <TaskTitleCell task={row.original} onOpen={onOpenTask} />
          ),
        }),
        helper.accessor((task) => task.project.name, {
          id: "project",
          header: "Project",
          cell: ({ row }) => <ProjectCell task={row.original} />,
        }),
        helper.display({
          id: "assignee",
          header: "Assignee",
          cell: ({ row }) => <AssigneeCell task={row.original} />,
        }),
        helper.accessor("status", {
          header: "Status",
          cell: ({ row }) => <StatusPill status={row.original.status} />,
        }),
        helper.accessor("dueDate", {
          header: "Due",
          cell: ({ row }) => <DueCell task={row.original} today={today} />,
        }),
        helper.accessor("startDate", {
          header: "Start",
          cell: ({ row }) => <StartCell task={row.original} />,
        }),
      ]),
    [today, onOpenTask],
  );

  const table = useTable({
    features,
    columns,
    data,
    // Without this the table keys rows by index, and selection then survives a
    // sort change while pointing at whatever row happens to sit in that slot.
    getRowId: (task) => task.id,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 md:px-6">
      <div className="bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-xs">
        <div className="min-h-0 flex-1 overflow-auto">
          <Table className="[&_td]:px-4 [&_th]:px-4">
            <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur-sm">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="hover:bg-transparent">
                  {group.headers.map((header) => {
                    const sortKey = SORTABLE[header.column.id];
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          "text-muted-foreground h-9 text-[11px] font-medium tracking-wide ",
                          header.column.id === "select" && "w-10",
                          HIDE_BELOW[header.column.id],
                        )}
                      >
                        {header.isPlaceholder ? null : sortKey ? (
                          <SortButton
                            label={<table.FlexRender header={header} />}
                            active={sort.key === sortKey}
                            order={sort.order}
                            onClick={() =>
                              setSort((current) =>
                                current.key === sortKey
                                  ? {
                                      key: sortKey,
                                      order:
                                        current.order === "asc"
                                          ? "desc"
                                          : "asc",
                                    }
                                  : { key: sortKey, order: "asc" },
                              )
                            }
                          />
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {data.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="h-64 p-0">
                    <Empty className="border-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <ListIcon aria-hidden />
                        </EmptyMedia>
                        <EmptyTitle>No tasks match these filters</EmptyTitle>
                        <EmptyDescription>
                          Clear a filter, or widen the search above, to see more
                          of this project.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className="cursor-pointer transition-colors"
                    onClick={() => onOpenTask(row.original.id)}
                  >
                    {row.getAllCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "h-12 max-w-56 truncate",
                          HIDE_BELOW[cell.column.id],
                        )}
                      >
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-muted-foreground bg-muted/20 flex shrink-0 items-center gap-3 border-t px-4 py-2.5 text-xs">
          <span aria-live="polite">
            Showing {data.length} of {total}
            {selectedCount ? ` · ${selectedCount} selected` : ""}
          </span>
          <span className="flex-1" />
          {query.hasNextPage ? (
            <Button
              variant="outline"
              size="sm"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};