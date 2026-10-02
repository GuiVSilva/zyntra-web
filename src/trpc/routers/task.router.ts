import { createTaskInput, listTasksInput } from "@/lib/validations/project";
import {
  createTRPCRouter,
  orgProcedure,
  permittedProcedure,
  taskProcedure,
} from "../init";
import * as taskService from "@/server/services/task.service";

export const taskRouter = createTRPCRouter({
  list: orgProcedure
    .input(listTasksInput)
    .query(({ ctx, input }) => taskService.list(ctx, input)),

  byId: taskProcedure.query(({ ctx }) =>
    taskService.byId(ctx, { taskId: ctx.task.id }),
  ),

  create: permittedProcedure({ task: ["create"] })
    .input(createTaskInput)
    .mutation(({ ctx, input }) => taskService.create(ctx, input)),
});