"use client";

import { startOfTodayUtc } from "@/lib/task.queries";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { TaskList, TaskListSkeleton } from "./task/task-list";
import { useTaskViewState } from "@/hooks/use-task-view";
import { CreateTaskDialog } from "./task/task-form";
import { Button } from "../ui/button";
import { PlusIcon } from "lucide-react";

export const ProjectWorkspace = ({ projectId }: { projectId: string }) => {
  const trpc = useTRPC();
  const canCreate = true;
  const canEdit = true;
  const [viewState, setViewState] = useTaskViewState();

  const statusQuery = useQuery(trpc.workflow.list.queryOptions({ projectId }));
  const statuses = statusQuery.data ?? [];

  const [creating, setCreating] = useState<string | null>(null);
  const today = startOfTodayUtc();

  const openTask = (taskId: string) => void setViewState({ task: taskId });
  const closeTask = () => void setViewState({ task: null });

  return (
    <>
      <div className="w-full flex mb-2 justify-end px-4">
        <Button size="sm" onClick={() => setCreating(statuses[0].id)}>
          <PlusIcon className="size-4" aria-hidden />
          <span className="hidden sm:inline">New task</span>
        </Button>
      </div>
      <Suspense fallback={<TaskListSkeleton />}>
        <TaskList
          projectId={projectId}
          viewState={viewState}
          today={today}
          onOpenTask={openTask}
        />
      </Suspense>

      {creating !== null ? (
        <CreateTaskDialog
          key={creating}
          projectId={projectId}
          statuses={statuses}
          open
          onOpenChange={(open) => setCreating(open ? creating : null)}
          defaultStatusId={creating}
        />
      ) : null}
    </>
  );
};