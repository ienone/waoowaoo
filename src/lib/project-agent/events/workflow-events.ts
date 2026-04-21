import type { WorkflowPackageId } from '@/lib/skill-system/types'

export type WorkflowCanonicalEventType =
  | 'workflow.plan.created'
  | 'workflow.approval.updated'
  | 'workflow.run.lifecycle'

export interface WorkflowCanonicalEvent {
  type: WorkflowCanonicalEventType
  workflowId: WorkflowPackageId
  occurredAt: string
  payload: Record<string, string | null>
}

export function buildWorkflowPlanCanonicalEvent(params: {
  workflowId: WorkflowPackageId
  commandId: string
  planId: string
}): WorkflowCanonicalEvent {
  return {
    type: 'workflow.plan.created',
    workflowId: params.workflowId,
    occurredAt: new Date().toISOString(),
    payload: {
      commandId: params.commandId,
      planId: params.planId,
      status: null,
      runId: null,
    },
  }
}

export function buildWorkflowApprovalCanonicalEvent(params: {
  workflowId: WorkflowPackageId
  planId: string
  status: 'pending' | 'approved' | 'rejected'
}): WorkflowCanonicalEvent {
  return {
    type: 'workflow.approval.updated',
    workflowId: params.workflowId,
    occurredAt: new Date().toISOString(),
    payload: {
      commandId: null,
      planId: params.planId,
      status: params.status,
      runId: null,
    },
  }
}

export function buildRunLifecycleCanonicalEvent(params: {
  workflowId: WorkflowPackageId
  runId: string
  status: 'start' | 'complete' | 'failed'
}): WorkflowCanonicalEvent {
  return {
    type: 'workflow.run.lifecycle',
    workflowId: params.workflowId,
    occurredAt: new Date().toISOString(),
    payload: {
      commandId: null,
      planId: null,
      status: params.status,
      runId: params.runId,
    },
  }
}
