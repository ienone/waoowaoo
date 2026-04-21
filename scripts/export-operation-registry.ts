import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { buildOperationRegistryExportSnapshot } from '@/lib/operations/primary-model'

const artifactDir = join(process.cwd(), 'docs', 'agent', 'artifacts')
const exportPath = join(artifactDir, 'operation-registry.export.json')
const progressPath = join(artifactDir, 'operation-convergence-progress.json')

mkdirSync(artifactDir, { recursive: true })

const snapshot = buildOperationRegistryExportSnapshot()
writeFileSync(exportPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')

const progress = {
  updatedAt: new Date().toISOString(),
  phases: [
    { id: 'step-0-inventory', status: 'completed' },
    { id: 'step-1-operation-model', status: 'completed' },
    { id: 'step-2-facade-split', status: 'completed' },
    { id: 'step-3-metadata-unification', status: 'completed' },
    { id: 'step-4-always-on-selector', status: 'completed' },
    { id: 'step-5-tests-and-export', status: 'completed' },
  ],
}
writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`, 'utf8')

process.stdout.write(`exported operation registry snapshot -> ${exportPath}\n`)
process.stdout.write(`updated convergence progress -> ${progressPath}\n`)
