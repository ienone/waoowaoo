import type { AssistantToolResult } from './types'

const DEFAULT_TOOL_ERROR_CODE = 'ASSISTANT_TOOL_ERROR'

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  if (error instanceof Error) return readTrimmedString(error.message)
  const record = error as Record<string, unknown>
  return readTrimmedString(record.message)
}

export function buildAssistantToolErrorResult(params: {
  error: unknown
  fallbackMessage: string
  fallbackCode?: string
}): AssistantToolResult {
  const message = readErrorMessage(params.error) || params.fallbackMessage
  const code = readTrimmedString(params.fallbackCode) || (message ? message : DEFAULT_TOOL_ERROR_CODE)
  return {
    status: 'error',
    code,
    message,
  }
}
