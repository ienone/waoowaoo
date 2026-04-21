import type {
  OperationChannels,
  OperationSelectionMeta,
  OperationToolMeta,
  ProjectAgentOperationDefinition,
  ProjectAgentOperationRegistry,
} from './types'

export interface OperationToolMetaDefaults {
  channels?: Partial<OperationChannels>
  tool?: Partial<OperationToolMeta>
  selection?: Partial<OperationSelectionMeta>
}

function normalizeStringList(values: string[] | undefined): string[] {
  if (!values) return []
  const out: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    out.push(trimmed)
  }
  return out
}

function requireDefined<T>(value: T | undefined, errorCode: string): T {
  if (value === undefined) {
    throw new Error(errorCode)
  }
  return value
}

function buildMergedChannels(
  operationId: string,
  operation: ProjectAgentOperationDefinition,
  defaults: OperationToolMetaDefaults,
): OperationChannels {
  const fromOp = operation.channels ?? {}
  const fromDefaults = defaults.channels ?? {}
  return {
    tool: requireDefined(fromOp.tool ?? fromDefaults.tool, `PROJECT_AGENT_CHANNELS_MISSING:${operationId}:tool`),
    api: requireDefined(fromOp.api ?? fromDefaults.api, `PROJECT_AGENT_CHANNELS_MISSING:${operationId}:api`),
  }
}

function buildMergedToolMeta(
  operationId: string,
  operation: ProjectAgentOperationDefinition,
  defaults: OperationToolMetaDefaults,
): OperationToolMeta {
  const fromOp = operation.tool ?? {}
  const fromDefaults = defaults.tool ?? {}
  const rawGroups = requireDefined(fromOp.groups ?? fromDefaults.groups, `PROJECT_AGENT_TOOL_META_MISSING:${operationId}:groups`)
  const rawTags = requireDefined(fromOp.tags ?? fromDefaults.tags, `PROJECT_AGENT_TOOL_META_MISSING:${operationId}:tags`)
  const groups = normalizeStringList(rawGroups)
  const tags = normalizeStringList(rawTags)
  if (groups.length === 0) throw new Error(`PROJECT_AGENT_TOOL_META_MISSING:${operationId}:groups`)
  if (tags.length === 0) throw new Error(`PROJECT_AGENT_TOOL_META_MISSING:${operationId}:tags`)

  return {
    selectable: requireDefined(fromOp.selectable ?? fromDefaults.selectable, `PROJECT_AGENT_TOOL_META_MISSING:${operationId}:selectable`),
    defaultVisibility: requireDefined(
      fromOp.defaultVisibility ?? fromDefaults.defaultVisibility,
      `PROJECT_AGENT_TOOL_META_MISSING:${operationId}:defaultVisibility`,
    ),
    groups,
    tags,
    phases: normalizeStringList(fromOp.phases ?? fromDefaults.phases),
    requiresEpisode: requireDefined(
      fromOp.requiresEpisode ?? fromDefaults.requiresEpisode,
      `PROJECT_AGENT_TOOL_META_MISSING:${operationId}:requiresEpisode`,
    ),
    allowInPlanMode: requireDefined(
      fromOp.allowInPlanMode ?? fromDefaults.allowInPlanMode,
      `PROJECT_AGENT_TOOL_META_MISSING:${operationId}:allowInPlanMode`,
    ),
    allowInActMode: requireDefined(
      fromOp.allowInActMode ?? fromDefaults.allowInActMode,
      `PROJECT_AGENT_TOOL_META_MISSING:${operationId}:allowInActMode`,
    ),
  }
}

function buildMergedSelectionMeta(
  operationId: string,
  operation: ProjectAgentOperationDefinition,
  defaults: OperationToolMetaDefaults,
): OperationSelectionMeta {
  const fromOp = operation.selection ?? {}
  const fromDefaults = defaults.selection ?? {}
  return {
    baseWeight: requireDefined(
      fromOp.baseWeight ?? fromDefaults.baseWeight,
      `PROJECT_AGENT_SELECTION_META_MISSING:${operationId}:baseWeight`,
    ),
    costHint: requireDefined(
      fromOp.costHint ?? fromDefaults.costHint,
      `PROJECT_AGENT_SELECTION_META_MISSING:${operationId}:costHint`,
    ),
  }
}

export function decorateProjectAgentOperationRegistryWithToolMeta(
  registry: ProjectAgentOperationRegistry,
  defaults: OperationToolMetaDefaults,
): ProjectAgentOperationRegistry {
  const out: ProjectAgentOperationRegistry = {}
  for (const [operationId, operation] of Object.entries(registry)) {
    out[operationId] = {
      ...operation,
      channels: buildMergedChannels(operationId, operation, defaults),
      tool: buildMergedToolMeta(operationId, operation, defaults),
      selection: buildMergedSelectionMeta(operationId, operation, defaults),
    }
  }
  return out
}
