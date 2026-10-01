import { z } from 'zod'
import {
  createTRPCRouter,
  orgProcedure,
  permittedProcedure,
  permittedProjectProcedure,
  projectProcedure
} from '../init'

import {
  createProjectInput,
  setProjectArchivedInput,
  updateProjectInput
} from '@/lib/validations/project'
import * as projectService from '@/server/services/project.service'

export const projectRouter = createTRPCRouter({
  list: orgProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        includeArchived: z.boolean().optional(),
        query: z.string().trim().min(1).max(100).optional()
      })
    )
    .query(({ ctx, input }) => projectService.list(ctx, input)),

  byId: projectProcedure.query(({ ctx }) =>
    projectService.byId(ctx, { projectId: ctx.project.id })
  ),

  create: permittedProcedure({ project: ['create'] })
    .input(createProjectInput)
    .mutation(({ ctx, input }) => projectService.create(ctx, input)),

  update: permittedProcedure({ project: ['update'] })
    .input(updateProjectInput)
    .mutation(({ ctx, input }) => projectService.update(ctx, input)),

  setArchived: permittedProjectProcedure({ project: ['archive'] })
    .input(setProjectArchivedInput)
    .mutation(({ ctx, input }) => projectService.setArchived(ctx, input)),

  delete: permittedProjectProcedure({ project: ['delete'] })
    .input(z.object({ projectId: z.string().min(1) }))
    .mutation(({ ctx }) =>
      projectService.remove(ctx, { projectId: ctx.project.id })
    )
})
