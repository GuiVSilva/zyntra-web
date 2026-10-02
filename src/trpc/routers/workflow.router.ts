import {
  createStatusInput,
  reorderStatusesInput,
  updateStatusInput
} from '@/lib/validations/project'
import {
  createTRPCRouter,
  permittedProjectProcedure,
  projectProcedure
} from '../init'
import * as statusService from '@/server/services/workflow.service'
import z from 'zod'

export const workflowStatusRouter = createTRPCRouter({
  list: projectProcedure.query(({ ctx }) =>
    statusService.listForProject(ctx, { projectId: ctx.project.id })
  ),

  create: permittedProjectProcedure({ project: ['update'] })
    .input(createStatusInput)
    .mutation(({ ctx, input }) =>
      statusService.create(ctx, { ...input, projectId: ctx.project.id })
    ),

  update: permittedProjectProcedure({ project: ['update'] })
    .input(updateStatusInput)
    .mutation(({ ctx, input }) => statusService.update(ctx, input)),

  reorder: permittedProjectProcedure({ project: ['update'] })
    .input(reorderStatusesInput)
    .mutation(({ ctx, input }) =>
      statusService.reorder(ctx, { ...input, projectId: ctx.project.id })
    ),

  delete: permittedProjectProcedure({ project: ['update'] })
    .input(z.object({ statusId: z.string().min(1) }))
    .mutation(({ ctx, input }) => statusService.remove(ctx, input))
})
