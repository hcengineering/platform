//
// Copyright © 2026 PRAUT
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import type { Employee } from '@hcengineering/contact'
import type { AccountUuid, PersonId, Ref, Space } from '@hcengineering/core'
import type { Lead } from '@hcengineering/lead'
import prautWorkflow, { type PrautOpportunity } from '@hcengineering/praut-workflow'
import {
  createOpportunityFromLead,
  createRiskFlag,
  getRequiredApprovalReasons,
  PrautWorkflowValidationError,
  requestApproval
} from './service'

const owner = 'employee-owner' as Ref<Employee>
const account = 'account-user' as AccountUuid
const space = 'praut-space' as Ref<Space>
const modifiedBy = 'person-user' as PersonId

const lead = {
  _id: 'lead-1',
  _class: 'lead:class:Lead',
  space,
  modifiedOn: 1,
  modifiedBy,
  attachedTo: 'customer-1',
  status: 'status-1',
  startDate: null,
  title: 'PRAUT automation lead'
} as unknown as Lead

describe('PRAUT workflow service', () => {
  it('creates an opportunity from a lead and marks approval requirement', () => {
    const result = createOpportunityFromLead({
      lead,
      owner,
      estimatedValue: 150000,
      hasAiOutput: true,
      detectedRisks: ['highValue', 'aiUncertainty']
    })

    expect(result.opportunity._class).toBe(prautWorkflow.class.PrautOpportunity)
    expect(result.opportunity.data.title).toBe('PRAUT automation lead')
    expect(result.opportunity.data.sourceLead).toBe(lead._id)
    expect(result.opportunity.data.owner).toBe(owner)
    expect(result.opportunity.data.requiresApproval).toBe(true)
    expect(result.approvalReasons).toEqual(['proposalPrice', 'aiOutput'])
    expect(result.riskFlags).toHaveLength(2)
    expect(result.riskFlags[0].data.opportunity).toBe(result.opportunity._id)
  })

  it('rejects opportunity creation without an owner', () => {
    expect(() =>
      createOpportunityFromLead({
        lead,
        owner: '' as Ref<Employee>
      })
    ).toThrow(PrautWorkflowValidationError)
  })

  it('builds approval records and an opportunity update patch', () => {
    const opportunity = 'opportunity-1' as Ref<PrautOpportunity>
    const result = requestApproval({
      opportunity,
      space,
      approvalType: 'proposalText',
      decision: 'approved',
      approvedBy: account,
      summary: 'Approved after human review.',
      decidedOn: 10
    })

    expect(result.approval._class).toBe(prautWorkflow.class.PrautApproval)
    expect(result.approval.data.opportunity).toBe(opportunity)
    expect(result.approval.data.riskLevel).toBe('high')
    expect(result.opportunityUpdate.lastApproval).toBe(result.approval._id)
    expect(result.opportunityUpdate.requiresApproval).toBe(false)
  })

  it('keeps approval required when review asks for changes', () => {
    const result = requestApproval({
      opportunity: 'opportunity-1' as Ref<PrautOpportunity>,
      space,
      approvalType: 'aiOutput',
      decision: 'changesRequested',
      approvedBy: account,
      summary: 'AI output needs corrections.'
    })

    expect(result.opportunityUpdate.requiresApproval).toBe(true)
  })

  it('rejects blank approval summaries and risk messages', () => {
    expect(() =>
      requestApproval({
        opportunity: 'opportunity-1' as Ref<PrautOpportunity>,
        space,
        approvalType: 'aiOutput',
        decision: 'approved',
        approvedBy: account,
        summary: ' '
      })
    ).toThrow(PrautWorkflowValidationError)

    expect(() =>
      createRiskFlag({
        opportunity: 'opportunity-1' as Ref<PrautOpportunity>,
        space,
        riskType: 'missingData',
        riskLevel: 'low',
        message: ''
      })
    ).toThrow(PrautWorkflowValidationError)
  })

  it('deduplicates required approval reasons', () => {
    expect(
      getRequiredApprovalReasons({
        estimatedValue: 200000,
        hasLegalText: true,
        hasAiOutput: true,
        detectedRisks: ['sensitiveData', 'manualException']
      })
    ).toEqual(['proposalPrice', 'proposalText', 'aiOutput', 'exception'])
  })
})
