"use client";

import { taskViewParser } from "@/lib/task-view-state";
import { useQueryStates } from "nuqs";

export function useTaskViewState() {
  return useQueryStates(taskViewParser, {
    history: "replace",
    shallow: false,
  });
}