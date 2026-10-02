import { inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "./routers/_app";

type Output = inferRouterOutputs<AppRouter>;

export type ProjectSummary = Output["project"]["list"]["items"][number];
export type ProjectDetail = Output["project"]["byId"];
export type TaskSummary = Output["task"]["list"]["items"][number];
export type WorkflowStatusRow = Output["workflow"]["list"][number];