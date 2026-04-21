import { describe, expect, it } from 'vitest'
import { ALWAYS_ON_OPERATION_IDS, buildOperationRegistryExportSnapshot } from '@/lib/operations/primary-model'

describe('operation registry export snapshot', () => {
  it('exports strongly typed operation snapshot and always-on tool list', () => {
    const snapshot = buildOperationRegistryExportSnapshot()
    expect(snapshot.schemaVersion).toBe(1)
    expect(snapshot.operations.length).toBeGreaterThan(0)
    for (const operation of snapshot.operations) {
      expect(operation.id).toBeTruthy()
      expect(operation.summary).toBeTruthy()
      expect(operation.descriptor.toolName).toBe(operation.id)
      expect(operation.input.jsonSchema).toBeDefined()
      expect(operation.output.jsonSchema).toBeDefined()
    }
    expect(snapshot.alwaysOnTools.map((item) => item.id)).toEqual(Array.from(ALWAYS_ON_OPERATION_IDS))
  })
})
