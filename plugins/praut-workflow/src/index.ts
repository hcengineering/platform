//
// Copyright © 2026 PRAUT
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import type { Employee, Organization, Person } from '@hcengineering/contact'
import type { AccountUuid, Class, Doc, MarkupBlobRef, Ref, Space, Timestamp } from '@hcengineering/core'
import type { Lead } from '@hcengineering/lead'
import type { IntlString, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { Project } from '@hcengineering/tracker'

/**
 * @public
 */
export type PrautWorkflowStage = 'lead' | 'qualification' | 'proposal' | 'handoff' | 'delivery' | 'reporting'

/**
 * @public
 */
export type PrautOpportunityStatus =
  | 'new'
  | 'qualified'
  | 'proposalDraft'
  | 'proposalReview'
  | 'proposalSent'
  | 'won'
  | 'lost'
  | 'handoffReady'
  | 'handoffDone'

/**
 * @public
 */
export type PrautApprovalType = 'proposalText' | 'proposalPrice' | 'aiOutput' | 'projectHandoff' | 'exception'

/**
 * @public
 */
export type PrautApprovalDecision = 'approved' | 'rejected' | 'changesRequested' | 'escalated'

/**
 * @public
 */
export type PrautRiskType =
  | 'missingData'
  | 'highValue'
  | 'legalText'
  | 'customerConflict'
  | 'aiUncertainty'
  | 'sensitiveData'
  | 'manualException'

/**
 * @public
 */
export type PrautRiskLevel = 'low' | 'medium' | 'high'

/**
 * @public
 */
export interface PrautOpportunity extends Doc {
  title: string
  sourceLead?: Ref<Lead>
  organization?: Ref<Organization>
  primaryContact?: Ref<Person>
  status: PrautOpportunityStatus
  owner: Ref<Employee>
  estimatedValue?: number
  currency?: string
  needSummary?: MarkupBlobRef | null
  nextStep?: string
  nextStepDue?: Timestamp | null
  requiresApproval: boolean
  lastApproval?: Ref<PrautApproval>
  project?: Ref<Project>
}

/**
 * @public
 */
export interface PrautApproval extends Doc {
  opportunity: Ref<PrautOpportunity>
  approvalType: PrautApprovalType
  decision: PrautApprovalDecision
  approvedBy: AccountUuid
  decidedOn: Timestamp
  summary: string
  sourceAiOutput?: string
  sourceDocument?: Ref<Doc>
  riskLevel: PrautRiskLevel
}

/**
 * @public
 */
export interface PrautRiskFlag extends Doc {
  opportunity: Ref<PrautOpportunity>
  riskType: PrautRiskType
  riskLevel: PrautRiskLevel
  message: string
  resolvedBy?: AccountUuid
  resolvedOn?: Timestamp
}

/**
 * @public
 */
export const prautWorkflowId = 'praut-workflow' as Plugin

/**
 * @public
 */
export default plugin(prautWorkflowId, {
  app: {
    PrautWorkflow: '' as Ref<Space>
  },
  class: {
    PrautOpportunity: '' as Ref<Class<PrautOpportunity>>,
    PrautApproval: '' as Ref<Class<PrautApproval>>,
    PrautRiskFlag: '' as Ref<Class<PrautRiskFlag>>
  },
  string: {
    PrautWorkflow: '' as IntlString,
    LeadToProject: '' as IntlString,
    ApprovalRequired: '' as IntlString,
    Opportunity: '' as IntlString,
    Opportunities: '' as IntlString,
    Approval: '' as IntlString,
    Approvals: '' as IntlString,
    RiskFlag: '' as IntlString,
    RiskFlags: '' as IntlString,
    Status: '' as IntlString,
    Owner: '' as IntlString,
    Customer: '' as IntlString,
    PrimaryContact: '' as IntlString,
    EstimatedValue: '' as IntlString,
    Currency: '' as IntlString,
    NextStep: '' as IntlString,
    NextStepDue: '' as IntlString,
    RequiresApproval: '' as IntlString,
    ApprovalType: '' as IntlString,
    Decision: '' as IntlString,
    ApprovedBy: '' as IntlString,
    DecidedOn: '' as IntlString,
    Summary: '' as IntlString,
    RiskLevel: '' as IntlString,
    RiskType: '' as IntlString,
    Message: '' as IntlString
  }
})
