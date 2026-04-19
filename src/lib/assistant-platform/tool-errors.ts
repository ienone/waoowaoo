import type { AssistantToolResult } from './types'
import { isRecord, readTrimmedString } from './utils'

const DEFAULT_TOOL_ERROR_CODE = 'ASSISTANT_TOOL_ERROR'

function readErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  if (error instanceof Error) return readTrimmedString(error.message)
  if (!isRecord(error)) return ''
  return readTrimmedString(error.message)
}

export function buildAssistantToolErrorResult(params: {
  error: unknown
  fallbackMessage: string
  fallbackCode?: string
}): AssistantToolResult {
  const message = readErrorMessage(params.error) || params.fallbackMessage
  const code = readTrimmedString(params.fallbackCode) || message || DEFAULT_TOOL_ERROR_CODE
  return {
    status: 'error',
    code,
    message,
  }
}
