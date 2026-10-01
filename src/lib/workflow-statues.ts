import { StatusCategory } from '@/generated/prisma/enums'
import { TokenColor } from './token-colors'

export const DEFAULT_WORKFLOW_STATUSES: readonly {
  name: string
  color: TokenColor
  category: StatusCategory
  position: number
}[] = [
  {
    name: 'Pendências',
    color: 'slate',
    category: StatusCategory.TODO,
    position: 0
  },
  {
    name: 'A fazer',
    color: 'slate',
    category: StatusCategory.TODO,
    position: 1
  },
  {
    name: 'Em andamento',
    color: 'blue',
    category: StatusCategory.ACTIVE,
    position: 2
  },
  {
    name: 'Em revisão',
    color: 'violet',
    category: StatusCategory.ACTIVE,
    position: 3
  },
  {
    name: 'Bloqueado',
    color: 'rose',
    category: StatusCategory.ACTIVE,
    position: 4
  },
  {
    name: 'Concluído',
    color: 'green',
    category: StatusCategory.DONE,
    position: 5
  }
] as const

export const STATUS_CATEGORIES = [
  StatusCategory.TODO,
  StatusCategory.ACTIVE,
  StatusCategory.DONE
] as const

export function isDoneCategory(category: StatusCategory): boolean {
  return category === StatusCategory.DONE
}

type CategoryMeta = {
  label: string
  /**
   * What an empty column of this category should say. Keyed on the category
   * rather than the status, because the status's name belongs to the team and a
   * column they called "Waiting on legal" still needs a sentence under it.
   */
  empty: string
  /** Sort order where categories are grouped — My Tasks, and later rollups. */
  order: number
}

export const STATUS_CATEGORY_META: Record<StatusCategory, CategoryMeta> = {
  [StatusCategory.TODO]: {
    label: 'Não iniciado',
    empty: 'Nenhuma tarefa na fila',
    order: 0
  },
  [StatusCategory.ACTIVE]: {
    label: 'Em andamento',
    empty: 'Nenhuma tarefa em andamento',
    order: 1
  },
  [StatusCategory.DONE]: {
    label: 'Concluído',
    empty: 'Nenhuma tarefa concluída ainda',
    order: 2
  }
}
