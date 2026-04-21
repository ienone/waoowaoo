import { z } from 'zod'
import type { ProjectAgentOperationRegistry } from './types'

const confirmInputSchema = z.object({
  confirmed: z.literal(true),
  reason: z.string().min(1).optional(),
})

const cancelInputSchema = z.object({
  cancelled: z.literal(true),
  reason: z.string().min(1).optional(),
})

const singleSelectInputSchema = z.object({
  selectionId: z.string().min(1),
})

const multiSelectInputSchema = z.object({
  selectionIds: z.array(z.string().min(1)).min(1),
})

const safetyAckInputSchema = z.object({
  acknowledged: z.literal(true),
  note: z.string().min(1).optional(),
})

export function createAlwaysOnOperations(): ProjectAgentOperationRegistry {
  return {
    ui_confirm: {
      id: 'ui_confirm',
      description: 'Confirm a previously requested high-risk operation.',
      channels: { tool: true, api: true },
      tool: {
        selectable: true,
        defaultVisibility: 'core',
        groups: ['ui', 'confirmation'],
        tags: ['ui', 'always-on', 'confirm'],
        phases: ['*'],
        requiresEpisode: false,
        allowInPlanMode: true,
        allowInActMode: true,
      },
      selection: { baseWeight: 100, costHint: 'low' },
      sideEffects: { mode: 'query', risk: 'none' },
      scope: 'command',
      inputSchema: confirmInputSchema,
      outputSchema: z.object({
        success: z.literal(true),
        confirmed: z.literal(true),
      }),
      execute: async (_ctx, _input) => ({ success: true, confirmed: true }),
    },
    ui_cancel: {
      id: 'ui_cancel',
      description: 'Cancel a previously requested operation.',
      channels: { tool: true, api: true },
      tool: {
        selectable: true,
        defaultVisibility: 'core',
        groups: ['ui', 'confirmation'],
        tags: ['ui', 'always-on', 'cancel'],
        phases: ['*'],
        requiresEpisode: false,
        allowInPlanMode: true,
        allowInActMode: true,
      },
      selection: { baseWeight: 100, costHint: 'low' },
      sideEffects: { mode: 'query', risk: 'none' },
      scope: 'command',
      inputSchema: cancelInputSchema,
      outputSchema: z.object({
        success: z.literal(true),
        cancelled: z.literal(true),
      }),
      execute: async (_ctx, _input) => ({ success: true, cancelled: true }),
    },
    ui_single_select: {
      id: 'ui_single_select',
      description: 'Select one option from a previously presented option list.',
      channels: { tool: true, api: true },
      tool: {
        selectable: true,
        defaultVisibility: 'core',
        groups: ['ui', 'selection'],
        tags: ['ui', 'always-on', 'single-select'],
        phases: ['*'],
        requiresEpisode: false,
        allowInPlanMode: true,
        allowInActMode: true,
      },
      selection: { baseWeight: 100, costHint: 'low' },
      sideEffects: { mode: 'query', risk: 'none' },
      scope: 'command',
      inputSchema: singleSelectInputSchema,
      outputSchema: z.object({
        success: z.literal(true),
        selectionId: z.string().min(1),
      }),
      execute: async (_ctx, input) => ({ success: true, selectionId: input.selectionId }),
    },
    ui_multi_select: {
      id: 'ui_multi_select',
      description: 'Select multiple options from a previously presented option list.',
      channels: { tool: true, api: true },
      tool: {
        selectable: true,
        defaultVisibility: 'core',
        groups: ['ui', 'selection'],
        tags: ['ui', 'always-on', 'multi-select'],
        phases: ['*'],
        requiresEpisode: false,
        allowInPlanMode: true,
        allowInActMode: true,
      },
      selection: { baseWeight: 100, costHint: 'low' },
      sideEffects: { mode: 'query', risk: 'none' },
      scope: 'command',
      inputSchema: multiSelectInputSchema,
      outputSchema: z.object({
        success: z.literal(true),
        selectionIds: z.array(z.string().min(1)).min(1),
      }),
      execute: async (_ctx, input) => ({ success: true, selectionIds: input.selectionIds }),
    },
    ui_safety_ack: {
      id: 'ui_safety_ack',
      description: 'Acknowledge a safety notice before continuing guarded flows.',
      channels: { tool: true, api: true },
      tool: {
        selectable: true,
        defaultVisibility: 'core',
        groups: ['ui', 'safety'],
        tags: ['ui', 'always-on', 'safety'],
        phases: ['*'],
        requiresEpisode: false,
        allowInPlanMode: true,
        allowInActMode: true,
      },
      selection: { baseWeight: 100, costHint: 'low' },
      sideEffects: { mode: 'query', risk: 'none' },
      scope: 'command',
      inputSchema: safetyAckInputSchema,
      outputSchema: z.object({
        success: z.literal(true),
        acknowledged: z.literal(true),
      }),
      execute: async (_ctx, _input) => ({ success: true, acknowledged: true }),
    },
  }
}
