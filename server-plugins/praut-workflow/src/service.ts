//
// Copyright © 2026 PRAUT
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import type { Employee, Organization, Person } from '@hcengineering/contact'
import type { AccountUuid, Class, Data, Doc, Ref, Space, Timestamp } from '@hcengineering/core'
import { generateId } from '@hcengineering/core'
import type { Lead } from '@hcengineering/lead'
import prautWorkflow, {
  type PrautApproval,
  type PrautApprovalDecision,
  type PrautApprovalType,
  type PrautOpportunity,
  type PrautOpportunityStatus,
  type PrautRiskFlag,
  type PrautRiskLevel,
  type PrautRiskType
} from '@hcengineering/praut-workflow'

/**
 * PRAUT workflow service functions are intentionally transaction-agnostic.
 * They prepare validated document payloads that callers can persist through
 * the normal Huly client/trigger transaction layer.
 */

/**
 * @public
 */
export interface PrautPreparedDoc<T extends Doc> {
  _id: Ref<T>
  _class: Ref<Class<T>>
  space: Ref<Space>
  data: Data<T>
}

/**
 * @public
 */
export interface PrautOpportunityFromLeadInput {
  lead: Lead
  owner: Ref<Employee>
  opportunitySpace?: Ref<Space>
  organization?: Ref<Organization>
  primaryContact?: Ref<Person>
  estimatedValue?: number
  currency?: string
  needSummary?: PrautOpportunity['needSummary']
  nextStep?: string
  nextStepDue?: Timestamp | null
  status?: PrautOpportunityStatus
  highValueThreshold?: number
  hasLegalText?: boolean
  hasAiOutput?: boolean
  detectedRisks?: PrautRiskType[]
}

/**
 * @public
 */
export interface PrautApprovalInput {
  opportunity: Ref<PrautOpportunity>
  space: Ref<Space>
  approvalType: PrautApprovalType
  decision: PrautApprovalDecision
  approvedBy: AccountUuid
  summary: string
  decidedOn?: Timestamp
  sourceAiOutput?: string
  sourceDocument?: Ref<Doc>
  riskLevel?: PrautRiskLevel
}

/**
 * @public
 */
export interface PrautRiskFlagInput {
  opportunity: Ref<PrautOpportunity>
  space: Ref<Space>
  riskType: PrautRiskType
  riskLevel: PrautRiskLevel
  message: string
  resolvedBy?: AccountUuid
  resolvedOn?: Timestamp
}

/**
 * @public
 */
export interface PrautApprovalResult {
  approval: PrautPreparedDoc<PrautApproval>
  opportunityUpdate: Pick<Data<PrautOpportunity>, 'lastApproval' | 'requiresApproval'>
}

/**
 * @public
 */
export interface PrautOpportunityResult {
  opportunity: PrautPreparedDoc<PrautOpportunity>
  approvalRequired: boolean
  approvalReasons: PrautApprovalType[]
  riskFlags: Array<PrautPreparedDoc<PrautRiskFlag>>
}

/**
 * @public
 */
export class PrautWorkflowValidationError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'PrautWorkflowValidationError'
  }
}

/**
 * @public
 */
export function createOpportunityFromLead (input: PrautOpportunityFromLeadInput): PrautOpportunityResult {
  if (input.owner === undefined || input.owner === null || input.owner === '') {
    throw new PrautWorkflowValidationError('Opportunity owner is required.')
  }

  const approvalReasons = getRequiredApprovalReasons(input)
  const opportunityId = generateId<PrautOpportunity>()
  const space = input.opportunitySpace ?? (input.lead.space as unknown as Ref<Space>)
  const opportunity: PrautPreparedDoc<PrautOpportunity> = {
    _id: opportunityId,
    _class: prautWorkflow.class.PrautOpportunity,
    space,
    data: {
      title: input.lead.title,
      sourceLead: input.lead._id,
      organization: input.organization,
      primaryContact: input.primaryContact,
      status: input.status ?? 'new',
      owner: input.owner,
      estimatedValue: input.estimatedValue,
      currency: input.currency,
      needSummary: input.needSummary,
      nextStep: input.nextStep,
      nextStepDue: input.nextStepDue,
      requiresApproval: approvalReasons.length > 0
    }
  }

  return {
    opportunity,
    approvalRequired: approvalReasons.length > 0,
    approvalReasons,
    riskFlags:
      input.detectedRisks?.map((riskType) =>
        createRiskFlag({
          opportunity: opportunityId,
          space,
          riskType,
          riskLevel: getRiskLevel(riskType),
          message: getRiskMessage(riskType)
        })
      ) ?? []
  }
}

/**
 * @public
 */
export function requestApproval (input: PrautApprovalInput): PrautApprovalResult {
  if (input.summary.trim().length === 0) {
    throw new PrautWorkflowValidationError('Approval summary is required.')
  }

  const approvalId = generateId<PrautApproval>()
  const approval: PrautPreparedDoc<PrautApproval> = {
    _id: approvalId,
    _class: prautWorkflow.class.PrautApproval,
    space: input.space,
    data: {
      opportunity: input.opportunity,
      approvalType: input.approvalType,
      decision: input.decision,
      approvedBy: input.approvedBy,
      decidedOn: input.decidedOn ?? Date.now(),
      summary: input.summary,
      sourceAiOutput: input.sourceAiOutput,
      sourceDocument: input.sourceDocument,
      riskLevel: input.riskLevel ?? getApprovalRiskLevel(input.approvalType)
    }
  }

  return {
    approval,
    opportunityUpdate: {
      lastApproval: approvalId,
      requiresApproval: input.decision !== 'approved'
    }
  }
}

/**
 * @public
 */
export function createRiskFlag (input: PrautRiskFlagInput): PrautPreparedDoc<PrautRiskFlag> {
  if (input.message.trim().length === 0) {
    throw new PrautWorkflowValidationError('Risk flag message is required.')
  }

  return {
    _id: generateId<PrautRiskFlag>(),
    _class: prautWorkflow.class.PrautRiskFlag,
    space: input.space,
    data: {
      opportunity: input.opportunity,
      riskType: input.riskType,
      riskLevel: input.riskLevel,
      message: input.message,
      resolvedBy: input.resolvedBy,
      resolvedOn: input.resolvedOn
    }
  }
}

/**
 * @public
 */
export function getRequiredApprovalReasons (input: {
  estimatedValue?: number
  highValueThreshold?: number
  hasLegalText?: boolean
  hasAiOutput?: boolean
  detectedRisks?: PrautRiskType[]
}): PrautApprovalType[] {
  const reasons = new Set<PrautApprovalType>()
  const highValueThreshold = input.highValueThreshold ?? 100000

  if (input.estimatedValue !== undefined && input.estimatedValue >= highValueThreshold) {
    reasons.add('proposalPrice')
  }
  if (input.hasLegalText === true) {
    reasons.add('proposalText')
  }
  if (input.hasAiOutput === true) {
    reasons.add('aiOutput')
  }
  if (input.detectedRisks?.some((risk) => risk === 'manualException' || risk === 'sensitiveData') === true) {
    reasons.add('exception')
  }

  return Array.from(reasons)
}

function getApprovalRiskLevel (approvalType: PrautApprovalType): PrautRiskLevel {
  switch (approvalType) {
    case 'proposalPrice':
    case 'proposalText':
    case 'exception':
      return 'high'
    case 'aiOutput':
    case 'projectHandoff':
      return 'medium'
    default:
      return 'low'
  }
}

function getRiskLevel (riskType: PrautRiskType): PrautRiskLevel {
  switch (riskType) {
    case 'highValue':
    case 'legalText':
    case 'sensitiveData':
      return 'high'
    case 'aiUncertainty':
    case 'customerConflict':
    case 'manualException':
      return 'medium'
    default:
      return 'low'
  }
}

function getRiskMessage (riskType: PrautRiskType): string {
  switch (riskType) {
    case 'missingData':
      return 'Opportunity contains incomplete input data and needs human review.'
    case 'highValue':
      return 'Opportunity value is high enough to require explicit approval.'
    case 'legalText':
      return 'Opportunity contains legal or contract-sensitive text.'
    case 'customerConflict':
      return 'Opportunity may affect an existing customer relationship.'
    case 'aiUncertainty':
      return 'AI output is uncertain and needs human validation.'
    case 'sensitiveData':
      return 'Opportunity contains sensitive data and needs restricted handling.'
    case 'manualException':
      return 'Opportunity was marked as a manual process exception.'
  }
}
