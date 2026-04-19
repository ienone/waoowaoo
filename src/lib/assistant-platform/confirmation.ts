import type { AssistantToolConfirmation, AssistantToolResult } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function buildConfirmationError(field: string, message: string): AssistantToolResult {
  return {
    status: 'invalid',
    code: 'ASSISTANT_CONFIRMATION_REQUIRED',
    message,
    issues: [{ code: 'ASSISTANT_CONFIRMATION_REQUIRED', field, message }],
  }
}

export function readAssistantToolConfirmation(raw: unknown): {
  ok: true
  confirmation: AssistantToolConfirmation
} | {
  ok: false
  error: AssistantToolResult
} {
  if (!isRecord(raw)) {
    return {
      ok: false,
      error: buildConfirmationError('confirmation', 'confirmation is required'),
    }
  }
  const confirmed = raw.confirmed
  if (confirmed !== true) {
    return {
      ok: false,
      error: buildConfirmationError('confirmation.confirmed', 'confirmation.confirmed must be true'),
    }
  }
  const budget = raw.budget
  if (budget !== undefined) {
    if (!isRecord(budget)) {
      return {
        ok: false,
        error: buildConfirmationError('confirmation.budget', 'confirmation.budget must be an object'),
      }
    }
    const budgetId = readTrimmedString(budget.id)
    if (!budgetId) {
      return {
        ok: false,
        error: buildConfirmationError('confirmation.budget.id', 'confirmation.budget.id is required'),
      }
    }
    return {
      ok: true,
      confirmation: {
        confirmed: true,
        budget: {
          id: budgetId,
        },
      },
    }
  }
  return {
    ok: true,
    confirmation: {
      confirmed: true,
    },
  }
}
