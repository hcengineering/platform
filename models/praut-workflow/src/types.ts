//
// Copyright © 2026 PRAUT
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import contact, { type Employee, type Organization, type Person } from '@hcengineering/contact'
import {
  IndexKind,
  type AccountUuid,
  type Doc,
  type Domain,
  type MarkupBlobRef,
  type Ref,
  type Timestamp
} from '@hcengineering/core'
import lead, { type Lead } from '@hcengineering/lead'
import {
  Index,
  Model,
  Prop,
  TypeAccountUuid,
  TypeBoolean,
  TypeCollaborativeDoc,
  TypeDate,
  TypeNumber,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import core, { TDoc } from '@hcengineering/model-core'
import { getEmbeddedLabel } from '@hcengineering/platform'
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
import tracker, { type Project } from '@hcengineering/tracker'

export const DOMAIN_PRAUT_WORKFLOW = 'praut-workflow' as Domain

@Model(prautWorkflow.class.PrautOpportunity, core.class.Doc, DOMAIN_PRAUT_WORKFLOW)
@UX(prautWorkflow.string.Opportunity, undefined, 'OPP', 'title', undefined, prautWorkflow.string.Opportunities)
export class TPrautOpportunity extends TDoc implements PrautOpportunity {
  @Prop(TypeString(), getEmbeddedLabel('Title'))
  @Index(IndexKind.FullText)
  title!: string

  @Prop(TypeRef(lead.class.Lead), getEmbeddedLabel('Source lead'))
  sourceLead?: Ref<Lead>

  @Prop(TypeRef(contact.class.Organization), prautWorkflow.string.Customer)
  organization?: Ref<Organization>

  @Prop(TypeRef(contact.class.Person), prautWorkflow.string.PrimaryContact)
  primaryContact?: Ref<Person>

  @Prop(TypeString(), prautWorkflow.string.Status)
  @Index(IndexKind.Indexed)
  status!: PrautOpportunityStatus

  @Prop(TypeRef(contact.mixin.Employee), prautWorkflow.string.Owner)
  @Index(IndexKind.Indexed)
  owner!: Ref<Employee>

  @Prop(TypeNumber(), prautWorkflow.string.EstimatedValue)
  estimatedValue?: number

  @Prop(TypeString(), prautWorkflow.string.Currency)
  currency?: string

  @Prop(TypeCollaborativeDoc(), getEmbeddedLabel('Need summary'))
  @Index(IndexKind.FullText)
  needSummary?: MarkupBlobRef | null

  @Prop(TypeString(), prautWorkflow.string.NextStep)
  nextStep?: string

  @Prop(TypeDate(), prautWorkflow.string.NextStepDue)
  nextStepDue?: Timestamp | null

  @Prop(TypeBoolean(), prautWorkflow.string.RequiresApproval)
  requiresApproval!: boolean

  @Prop(TypeRef(prautWorkflow.class.PrautApproval), prautWorkflow.string.Approval)
  lastApproval?: Ref<PrautApproval>

  @Prop(TypeRef(tracker.class.Project), getEmbeddedLabel('Project'))
  project?: Ref<Project>
}

@Model(prautWorkflow.class.PrautApproval, core.class.Doc, DOMAIN_PRAUT_WORKFLOW)
@UX(prautWorkflow.string.Approval, undefined, 'APPR', undefined, undefined, prautWorkflow.string.Approvals)
export class TPrautApproval extends TDoc implements PrautApproval {
  @Prop(TypeRef(prautWorkflow.class.PrautOpportunity), prautWorkflow.string.Opportunity)
  @Index(IndexKind.Indexed)
  opportunity!: Ref<PrautOpportunity>

  @Prop(TypeString(), prautWorkflow.string.ApprovalType)
  approvalType!: PrautApprovalType

  @Prop(TypeString(), prautWorkflow.string.Decision)
  @Index(IndexKind.Indexed)
  decision!: PrautApprovalDecision

  @Prop(TypeAccountUuid(), prautWorkflow.string.ApprovedBy)
  approvedBy!: AccountUuid

  @Prop(TypeDate(), prautWorkflow.string.DecidedOn)
  decidedOn!: Timestamp

  @Prop(TypeString(), prautWorkflow.string.Summary)
  @Index(IndexKind.FullText)
  summary!: string

  @Prop(TypeString(), getEmbeddedLabel('Source AI output'))
  sourceAiOutput?: string

  @Prop(TypeRef(core.class.Doc), getEmbeddedLabel('Source document'))
  sourceDocument?: Ref<Doc>

  @Prop(TypeString(), prautWorkflow.string.RiskLevel)
  @Index(IndexKind.Indexed)
  riskLevel!: PrautRiskLevel
}

@Model(prautWorkflow.class.PrautRiskFlag, core.class.Doc, DOMAIN_PRAUT_WORKFLOW)
@UX(prautWorkflow.string.RiskFlag, undefined, 'RISK', undefined, undefined, prautWorkflow.string.RiskFlags)
export class TPrautRiskFlag extends TDoc implements PrautRiskFlag {
  @Prop(TypeRef(prautWorkflow.class.PrautOpportunity), prautWorkflow.string.Opportunity)
  @Index(IndexKind.Indexed)
  opportunity!: Ref<PrautOpportunity>

  @Prop(TypeString(), prautWorkflow.string.RiskType)
  riskType!: PrautRiskType

  @Prop(TypeString(), prautWorkflow.string.RiskLevel)
  @Index(IndexKind.Indexed)
  riskLevel!: PrautRiskLevel

  @Prop(TypeString(), prautWorkflow.string.Message)
  @Index(IndexKind.FullText)
  message!: string

  @Prop(TypeAccountUuid(), getEmbeddedLabel('Resolved by'))
  resolvedBy?: AccountUuid

  @Prop(TypeDate(), getEmbeddedLabel('Resolved on'))
  resolvedOn?: Timestamp
}
