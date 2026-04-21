import type { z } from 'zod'
import {
  createProjectAgentOperationRegistry,
} from './registry'
import type {
  OperationChannels,
  OperationSelectionMeta,
  OperationSideEffects,
  OperationToolMeta,
  ProjectAgentOperationDefinition,
  ProjectAgentOperationRegistry,
} from './types'

export const ALWAYS_ON_OPERATION_IDS = [
  'ui_confirm',
  'ui_cancel',
  'ui_single_select',
  'ui_multi_select',
  'ui_safety_ack',
  'get_project_phase',
  'get_project_snapshot',
  'get_project_context',
  'list_storyboards',
  'list_runs',
  'list_tasks',
] as const

export interface OperationDescriptorSnapshot {
  toolName: string
  uiLabelKey: string
  descriptionKey: string
}

export interface OperationPrimaryModel {
  id: string
  description: string
  summary: string
  scope: ProjectAgentOperationDefinition['scope']
  channels: OperationChannels
  tool: OperationToolMeta
  selection: OperationSelectionMeta
  sideEffects: OperationSideEffects | null
  inputSchema: z.ZodTypeAny
  outputSchema: z.ZodTypeAny
  descriptor: OperationDescriptorSnapshot
  execute: ProjectAgentOperationDefinition['execute']
}

function requireDefined<T>(value: T | undefined, errorCode: string): T {
  if (value === undefined) {
    throw new Error(errorCode)
  }
  return value
}

function toDescriptor(id: string): OperationDescriptorSnapshot {
  return {
    toolName: id,
    uiLabelKey: `tool.${id}`,
    descriptionKey: `tool.${id}.desc`,
  }
}

function toRequiredToolMeta(operationId: string, operation: ProjectAgentOperationDefinition): OperationToolMeta {
  const tool = operation.tool
  if (!tool) {
    return {
      selectable: false,
      defaultVisibility: 'hidden',
      groups: ['internal'],
      tags: ['internal'],
      phases: [],
      requiresEpisode: operation.scope === 'episode' || operation.scope === 'storyboard' || operation.scope === 'panel',
      allowInPlanMode: true,
      allowInActMode: true,
    }
  }
  return {
    selectable: tool.selectable ?? true,
    defaultVisibility: requireDefined(tool.defaultVisibility, `PROJECT_AGENT_TOOL_META_FIELD_MISSING:${operationId}:defaultVisibility`),
    groups: requireDefined(tool.groups, `PROJECT_AGENT_TOOL_META_FIELD_MISSING:${operationId}:groups`),
    tags: requireDefined(tool.tags, `PROJECT_AGENT_TOOL_META_FIELD_MISSING:${operationId}:tags`),
    phases: tool.phases ?? [],
    requiresEpisode: tool.requiresEpisode ?? (operation.scope === 'episode' || operation.scope === 'storyboard' || operation.scope === 'panel'),
    allowInPlanMode: tool.allowInPlanMode ?? true,
    allowInActMode: tool.allowInActMode ?? true,
  }
}

function toRequiredSelectionMeta(operationId: string, operation: ProjectAgentOperationDefinition): OperationSelectionMeta {
  const selection = operation.selection ?? {}
  return {
    baseWeight: selection.baseWeight ?? 0,
    costHint: selection.costHint ?? 'low',
  }
}

function toRequiredChannels(operationId: string, operation: ProjectAgentOperationDefinition): OperationChannels {
  const channels = operation.channels ?? { tool: true, api: true }
  return {
    tool: channels.tool,
    api: channels.api,
  }
}

export function buildOperationPrimaryModels(registry: ProjectAgentOperationRegistry): OperationPrimaryModel[] {
  return Object.entries(registry)
    .map(([operationId, operation]) => ({
      id: operationId,
      description: operation.description,
      // summary currently mirrors description to keep backward-compatible tool copy behavior.
      summary: operation.description,
      scope: operation.scope,
      channels: toRequiredChannels(operationId, operation),
      tool: toRequiredToolMeta(operationId, operation),
      selection: toRequiredSelectionMeta(operationId, operation),
      sideEffects: operation.sideEffects ?? null,
      inputSchema: operation.inputSchema,
      outputSchema: operation.outputSchema,
      descriptor: toDescriptor(operationId),
      execute: operation.execute,
    }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

interface JsonSchemaShape {
  [key: string]: unknown
}

function convertZodTypeToJsonSchema(schema: z.ZodTypeAny): JsonSchemaShape {
  const definition = schema._def as { typeName?: string; options?: z.ZodTypeAny[]; values?: Set<string> }
  const typeName = definition.typeName
  if (typeName === 'ZodString') return { type: 'string' }
  if (typeName === 'ZodNumber') return { type: 'number' }
  if (typeName === 'ZodBoolean') return { type: 'boolean' }
  if (typeName === 'ZodNull') return { type: 'null' }
  if (typeName === 'ZodUnknown') return { type: 'unknown' }
  if (typeName === 'ZodAny') {
    throw new Error('PROJECT_AGENT_SCHEMA_ANY_FORBIDDEN')
  }
  if (typeName === 'ZodArray') {
    const itemType = (schema._def as { type: z.ZodTypeAny }).type
    return { type: 'array', items: convertZodTypeToJsonSchema(itemType) }
  }
  if (typeName === 'ZodEnum') {
    const values = (schema._def as { values: string[] }).values
    return { type: 'string', enum: values }
  }
  if (typeName === 'ZodNativeEnum') {
    const values = Object.values((schema._def as { values: Record<string, string | number> }).values)
      .filter((value) => typeof value === 'string' || typeof value === 'number')
    return { enum: values }
  }
  if (typeName === 'ZodDate') return { type: 'string', format: 'date-time' }
  if (typeName === 'ZodLiteral') {
    const value = (schema._def as { value: unknown }).value
    return { const: value }
  }
  if (typeName === 'ZodNullable') {
    const inner = (schema._def as { innerType: z.ZodTypeAny }).innerType
    return { anyOf: [convertZodTypeToJsonSchema(inner), { type: 'null' }] }
  }
  if (typeName === 'ZodOptional') {
    const inner = (schema._def as { innerType: z.ZodTypeAny }).innerType
    return convertZodTypeToJsonSchema(inner)
  }
  if (typeName === 'ZodDefault') {
    const inner = (schema._def as { innerType: z.ZodTypeAny }).innerType
    return convertZodTypeToJsonSchema(inner)
  }
  if (typeName === 'ZodEffects') {
    const inner = (schema._def as { schema: z.ZodTypeAny }).schema
    return convertZodTypeToJsonSchema(inner)
  }
  if (typeName === 'ZodUnion') {
    const options = (schema._def as { options: z.ZodTypeAny[] }).options
    return { oneOf: options.map((option) => convertZodTypeToJsonSchema(option)) }
  }
  if (typeName === 'ZodIntersection') {
    const left = (schema._def as { left: z.ZodTypeAny }).left
    const right = (schema._def as { right: z.ZodTypeAny }).right
    return { allOf: [convertZodTypeToJsonSchema(left), convertZodTypeToJsonSchema(right)] }
  }
  if (typeName === 'ZodLazy') {
    const getter = (schema._def as { getter: () => z.ZodTypeAny }).getter
    return convertZodTypeToJsonSchema(getter())
  }
  if (typeName === 'ZodObject') {
    const shape = (schema._def as { shape: () => Record<string, z.ZodTypeAny> }).shape()
    const properties: Record<string, JsonSchemaShape> = {}
    const required: string[] = []
    for (const [key, child] of Object.entries(shape)) {
      const childDef = child._def as { typeName?: string }
      properties[key] = convertZodTypeToJsonSchema(child)
      if (childDef.typeName !== 'ZodOptional') {
        required.push(key)
      }
    }
    return {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    }
  }
  if (typeName === 'ZodRecord') {
    const valueType = (schema._def as { valueType: z.ZodTypeAny }).valueType
    return {
      type: 'object',
      additionalProperties: convertZodTypeToJsonSchema(valueType),
    }
  }
  if (typeName === 'ZodTuple') {
    const items = (schema._def as { items: z.ZodTypeAny[] }).items
    return {
      type: 'array',
      prefixItems: items.map((item) => convertZodTypeToJsonSchema(item)),
      items: false,
    }
  }

  throw new Error(`PROJECT_AGENT_SCHEMA_EXPORT_UNSUPPORTED:${typeName || 'unknown'}`)
}

export interface OperationRegistryExportSnapshot {
  generatedAt: string
  schemaVersion: 1
  operations: Array<{
    id: string
    summary: string
    risk: {
      level: NonNullable<OperationSideEffects['risk']>
      requiresConfirmation: boolean
    }
    scopes: string[]
    input: { jsonSchema: JsonSchemaShape }
    output: { jsonSchema: JsonSchemaShape }
    descriptor: OperationDescriptorSnapshot
  }>
  alwaysOnTools: Array<{ id: string }>
}

export function buildOperationRegistryExportSnapshot(): OperationRegistryExportSnapshot {
  const registry = createProjectAgentOperationRegistry()
  const operations = buildOperationPrimaryModels(registry)
  return {
    generatedAt: new Date().toISOString(),
    schemaVersion: 1,
    operations: operations.map((operation) => {
      try {
        return {
          id: operation.id,
          summary: operation.summary,
          risk: {
            level: operation.sideEffects?.risk ?? 'none',
            requiresConfirmation: operation.sideEffects?.requiresConfirmation === true,
          },
          scopes: [operation.scope],
          input: {
            jsonSchema: convertZodTypeToJsonSchema(operation.inputSchema),
          },
          output: {
            jsonSchema: convertZodTypeToJsonSchema(operation.outputSchema),
          },
          descriptor: operation.descriptor,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'PROJECT_AGENT_SCHEMA_EXPORT_FAILED'
        throw new Error(`PROJECT_AGENT_SCHEMA_EXPORT_FAILED:${operation.id}:${message}`)
      }
    }),
    alwaysOnTools: ALWAYS_ON_OPERATION_IDS.map((id) => ({ id })),
  }
}
