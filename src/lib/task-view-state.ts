import { TaskPriority } from "@/generated/prisma/enums";
import {
  createLoader,
  inferParserType,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";

export const TASK_VIEWS = ["board", "list", "calendar"] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export const taskViewParser = {
  view: parseAsStringLiteral(TASK_VIEWS).withDefault("list"),
  status: parseAsArrayOf(parseAsString),
  priority: parseAsArrayOf(parseAsStringLiteral(Object.values(TaskPriority))),
  assignee: parseAsArrayOf(parseAsString),
  label: parseAsArrayOf(parseAsString),
  q: parseAsString,
  task: parseAsString,
  month: parseAsString,
};

export type TaskViewState = inferParserType<typeof taskViewParser>;

export const loadTaskViewState = createLoader(taskViewParser);

export type TaskListFilters = {
  statusIds?: string[];
  labelIds?: string[];
  priority?: TaskPriority[];
  assigneeIds?: (string | null)[];
  query?: string;
};

export const UNASSIGNED = "none";
export const BOARD_PAGE_SIZE = 25;
export const LIST_PAGE_SIZE = 50;

export function filtersFromViewState(state: TaskViewState): TaskListFilters {
  return {
    ...(state.status?.length ? { statusIds: state.status } : {}),
    ...(state.label?.length ? { labelIds: state.label } : {}),
    ...(state.priority?.length ? { priority: state.priority } : {}),
    ...(state.assignee?.length
      ? {
          assigneeIds: state.assignee.map((id) =>
            id === UNASSIGNED ? null : id,
          ),
        }
      : {}),
    ...(state.q ? { query: state.q } : {}),
  };
}

export function listViewInput(
  projectId: string,
  state: TaskViewState,
  sort: {
    sort: "rank" | "dueDate" | "priority" | "title" | "createdAt";
    order: "asc" | "desc";
  },
) {
  return {
    ...filtersFromViewState(state),
    projectId,
    limit: LIST_PAGE_SIZE,
    sort: sort.sort,
    order: sort.order,
  };
}

type PriorityMeta = {
  label: string;

  bars: 1 | 2 | 3;
  color: string;
};

export const TASK_PRIORITY_META: Record<TaskPriority, PriorityMeta> = {
  [TaskPriority.LOW]: {
    label: "Low",
    bars: 1,
    color: "text-muted-foreground",
  },
  [TaskPriority.MEDIUM]: { label: "Medium", bars: 2, color: "text-info" },
  [TaskPriority.HIGH]: { label: "High", bars: 3, color: "text-warning" },
  [TaskPriority.CRITICAL]: {
    label: "Critical",
    bars: 3,
    color: "text-destructive",
  },
};

export const TASK_PRIORITIES = [
  TaskPriority.LOW,
  TaskPriority.MEDIUM,
  TaskPriority.HIGH,
  TaskPriority.CRITICAL,
] as const;