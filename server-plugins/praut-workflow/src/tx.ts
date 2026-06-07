//
// Copyright © 2026 PRAUT
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import type { Doc, DocumentUpdate, PersonId, Ref, Timestamp, TxCreateDoc, TxUpdateDoc } from '@hcengineering/core'
import { TxFactory } from '@hcengineering/core'
import type { Lead } from '@hcengineering/lead'
import prautWorkflow, {
  type PrautApproval,
  type PrautOpportunity,
  type PrautRiskFlag
} from '@hcengineering/praut-workflow'
import type { PrautApprovalInput, PrautOpportunityFromLeadInput, PrautPreparedDoc } from './service'
import { createOpportunityFromLead, requestApproval } from './service'

/**
 * @public
 */
export interface PrautTxContext {
  modifiedBy: PersonId
  modifiedOn?: Timestamp
}

/**
 * @public
 */
export interface PrautOpportunityTxResult {
  opportunity: TxCreateDoc<PrautOpportunity>
  riskFlags: Array<TxCreateDoc<PrautRiskFlag>>
  approvalRequired: boolean
  approvalReasons: ReturnType<typeof createOpportunityFromLead>['approvalReasons']
}

/**
 * @public
 */
export interface PrautApprovalTxResult {
  approval: TxCreateDoc<PrautApproval>
  opportunityUpdate: TxUpdateDoc<PrautOpportunity>
}

/**
 * @public
 */
export function preparedDocToCreateTx<T extends Doc>(
  prepared: PrautPreparedDoc<T>,
  context: PrautTxContext
): TxCreateDoc<T> {
  const txFactory = new TxFactory(context.modifiedBy)
  return txFactory.createTxCreateDoc<T>(
    prepared._class,
    prepared.space,
    prepared.data,
    prepared._id,
    context.modifiedOn
  )
}

/**
 * @public
 */
export function createOpportunityTxesFromLead (
  input: PrautOpportunityFromLeadInput,
  context: PrautTxContext
): PrautOpportunityTxResult {
  const result = createOpportunityFromLead(input)

  return {
    opportunity: preparedDocToCreateTx(result.opportunity, context),
    riskFlags: result.riskFlags.map((riskFlag) => preparedDocToCreateTx(riskFlag, context)),
    approvalRequired: result.approvalRequired,
    approvalReasons: result.approvalReasons
  }
}

/**
 * @public
 */
export function requestApprovalTxes (input: PrautApprovalInput, context: PrautTxContext): PrautApprovalTxResult {
  const result = requestApproval(input)
  const txFactory = new TxFactory(context.modifiedBy)

  return {
    approval: preparedDocToCreateTx(result.approval, context),
    opportunityUpdate: txFactory.createTxUpdateDoc(
      prautWorkflow.class.PrautOpportunity,
      input.space,
      input.opportunity,
      result.opportunityUpdate as DocumentUpdate<PrautOpportunity>,
      undefined,
      context.modifiedOn
    )
  }
}

/**
 * @public
 */
export function markOpportunityApprovalRequiredTx (
  opportunity: Ref<PrautOpportunity>,
  space: PrautApprovalInput['space'],
  requiresApproval: boolean,
  context: PrautTxContext
): TxUpdateDoc<PrautOpportunity> {
  const txFactory = new TxFactory(context.modifiedBy)
  return txFactory.createTxUpdateDoc(
    prautWorkflow.class.PrautOpportunity,
    space,
    opportunity,
    { requiresApproval } as DocumentUpdate<PrautOpportunity>,
    undefined,
    context.modifiedOn
  )
}

/**
 * @public
 */
export function getSourceLeadId (tx: TxCreateDoc<PrautOpportunity>): Ref<Lead> | undefined {
  return tx.attributes.sourceLead
}
