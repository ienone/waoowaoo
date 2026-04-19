import { jsonSchema, tool, type ToolSet } from 'ai'
import type { JSONSchema7 } from 'json-schema'
import { getProviderKey } from '@/lib/api-config'
import type { OpenAICompatMediaTemplate } from '@/lib/openai-compat-media-template'
import { saveModelTemplateConfiguration } from '@/lib/user-api/model-template/save'
import { validateOpenAICompatMediaTemplate } from '@/lib/user-api/model-template/validator'
import type {
  AssistantRuntimeContext,
  AssistantSkillDefinition,
  AssistantToolConfirmation,
  AssistantToolResult,
} from '../types'
import { AssistantPlatformError } from '../errors'
import { readAssistantToolConfirmation } from '../confirmation'
import { buildAssistantToolErrorResult } from '../tool-errors'
import { renderAssistantSystemPrompt } from '../system-prompts'

interface SaveModelTemplateItemInput {
  modelId: string
  name: string
  type: 'image' | 'video'
  compatMediaTemplate: unknown
}

interface SaveModelTemplateToolInput extends SaveModelTemplateItemInput {
  confirmation: AssistantToolConfirmation
}

interface SaveModelTemplatesToolInput {
  models: SaveModelTemplateItemInput[]
  confirmation: AssistantToolConfirmation
}

const saveModelTemplateItemSchema: JSONSchema7 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    modelId: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    type: { type: 'string', enum: ['image', 'video'] },
    compatMediaTemplate: { type: 'object' },
  },
  required: ['modelId', 'name', 'type', 'compatMediaTemplate'],
}

const toolConfirmationSchema: JSONSchema7 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    confirmed: { type: 'boolean' },
    budget: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string', minLength: 1 },
      },
      required: ['id'],
    },
  },
  required: ['confirmed'],
}

const saveModelTemplateInputSchema = jsonSchema<SaveModelTemplateToolInput>({
  type: 'object',
  additionalProperties: false,
  properties: {
    ...saveModelTemplateItemSchema.properties,
    confirmation: toolConfirmationSchema,
  },
  required: [...(saveModelTemplateItemSchema.required || []), 'confirmation'],
})

const saveModelTemplatesInputSchema = jsonSchema<SaveModelTemplatesToolInput>({
  type: 'object',
  additionalProperties: false,
  properties: {
    models: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: saveModelTemplateItemSchema,
    },
    confirmation: toolConfirmationSchema,
  },
  required: ['models', 'confirmation'],
})

function buildSystemPrompt(ctx: AssistantRuntimeContext): string {
  return renderAssistantSystemPrompt('api-config-template', {
    providerId: ctx.context.providerId || '',
  })
}

function createApiConfigTemplateTools(ctx: AssistantRuntimeContext): ToolSet {
  const providerId = ctx.context.providerId?.trim() || ''
  if (!providerId) {
    throw new AssistantPlatformError('ASSISTANT_CONTEXT_REQUIRED', 'providerId is required for api-config-template assistant')
  }
  if (getProviderKey(providerId) !== 'openai-compatible') {
    throw new AssistantPlatformError('ASSISTANT_CONTEXT_REQUIRED', 'api-config-template assistant requires openai-compatible providerId')
  }

  return {
    saveModelTemplates: tool({
      description: '当用户一次要配置多个模型时调用，批量校验并保存到当前 provider。',
      inputSchema: saveModelTemplatesInputSchema,
      execute: async (input): Promise<AssistantToolResult> => {
        const confirmation = readAssistantToolConfirmation(input.confirmation)
        if (!confirmation.ok) {
          return confirmation.error
        }
        const normalizedItems: Array<{
          modelId: string
          name: string
          type: 'image' | 'video'
          template: OpenAICompatMediaTemplate
        }> = []

        for (let index = 0; index < input.models.length; index += 1) {
          const item = input.models[index]
          const normalizedModelId = item.modelId.trim()
          const normalizedName = item.name.trim() || normalizedModelId
          if (!normalizedModelId) {
            return {
              status: 'invalid',
              code: 'MODEL_TEMPLATE_INVALID',
              message: `models[${index}].modelId is required`,
              issues: [{
                code: 'MODEL_TEMPLATE_INVALID',
                field: `models[${index}].modelId`,
                message: 'modelId is required',
              }],
            }
          }

          const validated = validateOpenAICompatMediaTemplate(item.compatMediaTemplate)
          if (!validated.ok || !validated.template) {
            return {
              status: 'invalid',
              code: 'MODEL_TEMPLATE_INVALID',
              message: `models[${index}] template validation failed`,
              issues: validated.issues.map((issue) => ({
                ...issue,
                field: `models[${index}].${issue.field}`,
              })),
            }
          }

          if (validated.template.mediaType !== item.type) {
            return {
              status: 'invalid',
              code: 'MODEL_TEMPLATE_MEDIATYPE_MISMATCH',
              message: `models[${index}] template mediaType does not match model type`,
              issues: [
                {
                  code: 'MODEL_TEMPLATE_MEDIATYPE_MISMATCH',
                  field: `models[${index}].compatMediaTemplate.mediaType`,
                  message: 'template mediaType does not match model type',
                },
              ],
            }
          }

          normalizedItems.push({
            modelId: normalizedModelId,
            name: normalizedName,
            type: item.type,
            template: validated.template,
          })
        }

        const savedResults: Array<{
          savedModelKey: string
          draftModel: NonNullable<AssistantToolResult['draftModel']>
        }> = []

        for (const item of normalizedItems) {
          try {
            const saved = await saveModelTemplateConfiguration({
              userId: ctx.userId,
              providerId,
              modelId: item.modelId,
              name: item.name,
              type: item.type,
              template: item.template,
              source: 'ai',
            })
            savedResults.push({
              savedModelKey: saved.modelKey,
              draftModel: {
                modelId: item.modelId,
                name: item.name,
                type: item.type,
                provider: providerId,
                compatMediaTemplate: item.template,
              },
            })
          } catch (error) {
            return buildAssistantToolErrorResult({
              error,
              fallbackMessage: 'model template batch save failed',
              fallbackCode: 'MODEL_TEMPLATE_BATCH_SAVE_FAILED',
            })
          }
        }

        const first = savedResults[0]
        if (!first) {
          return {
            status: 'error',
            code: 'MODEL_TEMPLATE_INVALID',
            message: 'no models saved',
          }
        }

        return {
          status: 'saved',
          message: `模型已批量保存：${savedResults.length} 个`,
          savedModelKey: first.savedModelKey,
          draftModel: first.draftModel,
          savedModelKeys: savedResults.map((item) => item.savedModelKey),
          draftModels: savedResults.map((item) => item.draftModel),
        }
      },
    }),
    saveModelTemplate: tool({
      description: '当模型模板字段完整且可执行时调用，自动保存到当前 provider。',
      inputSchema: saveModelTemplateInputSchema,
      execute: async (input): Promise<AssistantToolResult> => {
        const confirmation = readAssistantToolConfirmation(input.confirmation)
        if (!confirmation.ok) {
          return confirmation.error
        }
        const normalizedModelId = input.modelId.trim()
        const normalizedName = input.name.trim() || normalizedModelId
        if (!normalizedModelId) {
          return {
            status: 'invalid',
            code: 'MODEL_TEMPLATE_INVALID',
            message: 'modelId is required',
            issues: [{ code: 'MODEL_TEMPLATE_INVALID', field: 'modelId', message: 'modelId is required' }],
          }
        }

        const validated = validateOpenAICompatMediaTemplate(input.compatMediaTemplate)
        if (!validated.ok || !validated.template) {
          return {
            status: 'invalid',
            code: 'MODEL_TEMPLATE_INVALID',
            message: 'template validation failed',
            issues: validated.issues,
          }
        }

        if (validated.template.mediaType !== input.type) {
          return {
            status: 'invalid',
            code: 'MODEL_TEMPLATE_MEDIATYPE_MISMATCH',
            message: 'template mediaType does not match model type',
            issues: [
              {
                code: 'MODEL_TEMPLATE_MEDIATYPE_MISMATCH',
                field: 'compatMediaTemplate.mediaType',
                message: 'template mediaType does not match model type',
              },
            ],
          }
        }

        let saved: { modelKey: string }
        try {
          saved = await saveModelTemplateConfiguration({
            userId: ctx.userId,
            providerId,
            modelId: normalizedModelId,
            name: normalizedName,
            type: input.type,
            template: validated.template,
            source: 'ai',
          })
        } catch (error) {
          return buildAssistantToolErrorResult({
            error,
            fallbackMessage: 'model template save failed',
            fallbackCode: 'MODEL_TEMPLATE_SAVE_FAILED',
          })
        }

        return {
          status: 'saved',
          message: `模型已保存：${saved.modelKey}`,
          savedModelKey: saved.modelKey,
          draftModel: {
            modelId: normalizedModelId,
            name: normalizedName,
            type: input.type,
            provider: providerId,
            compatMediaTemplate: validated.template,
          },
        }
      },
    }),
  }
}

export const apiConfigTemplateSkill: AssistantSkillDefinition = {
  id: 'api-config-template',
  systemPrompt: buildSystemPrompt,
  tools: createApiConfigTemplateTools,
  temperature: 0.2,
}
