import type {
  OperationSideEffects,
  OperationToolVisibility,
  OperationScope,
  ProjectAgentOperationRegistry,
} from '@/lib/operations/types'
import { buildOperationPrimaryModels } from '@/lib/operations/primary-model'
import { localizeSelectableToolDescription } from './copy'
import { normalizeProjectAgentLocale } from './locale'

export interface ProjectAgentToolCatalogItem {
  operationId: string
  description: string
  groups: string[]
  tags: string[]
  defaultVisibility: OperationToolVisibility
  scope: OperationScope
  sideEffects: OperationSideEffects | null
}

export interface ProjectAgentToolCatalog {
  tools: ProjectAgentToolCatalogItem[]
}

function normalizeStringList(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  const out: string[] = []
  for (const value of values) {
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (!trimmed) continue
    out.push(trimmed)
  }
  return out
}

export function buildProjectAgentToolCatalog(
  operations: ProjectAgentOperationRegistry,
  locale?: string,
): ProjectAgentToolCatalog {
  const normalizedLocale = normalizeProjectAgentLocale(locale)
  const tools: ProjectAgentToolCatalogItem[] = []
  const primaryModels = buildOperationPrimaryModels(operations)
  for (const operation of primaryModels) {
    const operationId = operation.id
    const channels = operation.channels
    if (!channels.tool) continue
    if (!operation.tool.selectable) continue

    tools.push({
      operationId,
      description: localizeSelectableToolDescription(operationId, operation.summary, normalizedLocale),
      groups: normalizeStringList(operation.tool.groups),
      tags: normalizeStringList(operation.tool.tags),
      defaultVisibility: operation.tool.defaultVisibility as OperationToolVisibility,
      scope: operation.scope,
      sideEffects: operation.sideEffects ?? null,
    })
  }

  tools.sort((a, b) => {
    const groupA = a.groups.join('/').toLowerCase()
    const groupB = b.groups.join('/').toLowerCase()
    if (groupA !== groupB) return groupA.localeCompare(groupB)
    return a.operationId.localeCompare(b.operationId)
  })

  return { tools }
}
