export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
