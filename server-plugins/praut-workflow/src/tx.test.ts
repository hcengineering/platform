//
// Copyright © 2026 PRAUT
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import type { Employee } from '@hcengineering/contact'
import core, { type AccountUuid, type PersonId, type Ref, type Space } from '@hcengineering/core'
import type { Lead } from '@hcengineering/lead'
import prautWorkflow, { type PrautOpportunity } from '@hcengineering/praut-workflow'
import { createOpportunityTxesFromLead, getSourceLeadId, markOpportunityApprovalRequiredTx, requestApprovalTxes } from './tx'

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
  title: 'PRAUT transaction lead'
} as unknown as Lead

describe('PRAUT workflow tx adapter', () => {
  it('creates Huly create transactions for opportunity and risk flags', () => {
    const result = createOpportunityTxesFromLead(
      {
        lead,
        owner,
        estimatedValue: 150000,
        detectedRisks: ['highValue']
      },
      {
        modifiedBy,
        modifiedOn: 20
      }
    )

    expect(result.opportunity._class).toBe(core.class.TxCreateDoc)
    expect(result.opportunity.objectClass).toBe(prautWorkflow.class.PrautOpportunity)
    expect(result.opportunity.objectSpace).toBe(space)
    expect(result.opportunity.modifiedBy).toBe(modifiedBy)
    expect(result.opportunity.modifiedOn).toBe(20)
    expect(result.opportunity.attributes.title).toBe('PRAUT transaction lead')
    expect(result.opportunity.attributes.requiresApproval).toBe(true)
    expect(getSourceLeadId(result.opportunity)).toBe(lead._id)

    expect(result.riskFlags).toHaveLength(1)
    expect(result.riskFlags[0].objectClass).toBe(prautWorkflow.class.PrautRiskFlag)
    expect(result.riskFlags[0].attributes.opportunity).toBe(result.opportunity.objectId)
  })

  it('creates approval create tx and opportunity update tx', () => {
    const opportunity = 'opportunity-1' as Ref<PrautOpportunity>
    const result = requestApprovalTxes(
      {
        opportunity,
        space,
        approvalType: 'aiOutput',
        decision: 'changesRequested',
        approvedBy: account,
        summary: 'Needs a human rewrite.',
        decidedOn: 25
      },
      {
        modifiedBy,
        modifiedOn: 30
      }
    )

    expect(result.approval._class).toBe(core.class.TxCreateDoc)
    expect(result.approval.objectClass).toBe(prautWorkflow.class.PrautApproval)
    expect(result.approval.attributes.opportunity).toBe(opportunity)
    expect(result.approval.attributes.riskLevel).toBe('medium')

    expect(result.opportunityUpdate._class).toBe(core.class.TxUpdateDoc)
    expect(result.opportunityUpdate.objectClass).toBe(prautWorkflow.class.PrautOpportunity)
    expect(result.opportunityUpdate.objectId).toBe(opportunity)
    expect(result.opportunityUpdate.objectSpace).toBe(space)
    expect(result.opportunityUpdate.modifiedBy).toBe(modifiedBy)
    expect(result.opportunityUpdate.modifiedOn).toBe(30)
    expect(result.opportunityUpdate.operations.lastApproval).toBe(result.approval.objectId)
    expect(result.opportunityUpdate.operations.requiresApproval).toBe(true)
  })

  it('creates direct approval-required update tx', () => {
    const opportunity = 'opportunity-1' as Ref<PrautOpportunity>
    const tx = markOpportunityApprovalRequiredTx(opportunity, space, false, {
      modifiedBy,
      modifiedOn: 40
    })

    expect(tx._class).toBe(core.class.TxUpdateDoc)
    expect(tx.objectId).toBe(opportunity)
    expect(tx.operations.requiresApproval).toBe(false)
    expect(tx.modifiedBy).toBe(modifiedBy)
    expect(tx.modifiedOn).toBe(40)
  })
})
