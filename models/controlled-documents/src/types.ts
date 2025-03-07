//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import request from '@hcengineering/request'
import {
  type ChangeControl,
  type ControlledDocument,
  type ControlledDocumentState,
  type Document,
  type HierarchyDocument,
  type DocumentApprovalRequest,
  type DocumentCategory,
  type DocumentRequest,
  type DocumentReviewRequest,
  type DocumentComment,
  type DocumentSpace,
  type DocumentSpaceType,
  type DocumentSpaceTypeDescriptor,
  type DocumentState,
  type DocumentTemplate,
  type DocumentMeta,
  type ExternalSpace,
  type OrgSpace,
  type Project,
  type ProjectDocument,
  type ProjectMeta,
  type DocumentTraining,
  type DocumentSnapshot,
  type ControlledDocumentSnapshot
} from '@hcengineering/controlled-documents'
import { TRequest } from '@hcengineering/model-request'
import { type Attachment } from '@hcengineering/attachment'
import contact, { type Employee } from '@hcengineering/contact'
import {
  DateRangeMode,
  IndexKind,
  type Class,
  type MarkupBlobRef,
  type Domain,
  type Ref,
  type Timestamp,
  type Type,
  type CollectionSize,
  type Role,
  type TypedSpace,
  type RolesAssignment,
  type Rank,
  type AccountUuid
} from '@hcengineering/core'
import {
  ArrOf,
  Collection,
  Hidden,
  Index,
  Mixin,
  Model,
  Prop,
  TypeBoolean,
  TypeDate,
  TypeNumber,
  TypeRef,
  TypeString,
  UX,
  TypeCollaborativeDoc,
  TypeMarkup,
  ReadOnly
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import chunter, { TChatMessage } from '@hcengineering/model-chunter'
import core, {
  TAttachedDoc,
  TDoc,
  TTypedSpace,
  TType,
  TSpaceTypeDescriptor,
  TSpaceType
} from '@hcengineering/model-core'
import { getEmbeddedLabel } from '@hcengineering/platform'
import tags, { type TagReference } from '@hcengineering/tags'
import time, { type ToDo } from '@hcengineering/time'
import training, { type Training, type TrainingRequest } from '@hcengineering/training'

import documents from './plugin'

export const DOMAIN_DOCUMENTS = 'documents' as Domain

@Model(documents.class.DocumentSpace, core.class.TypedSpace)
@UX(core.string.Space)
export class TDocumentSpace extends TTypedSpace implements DocumentSpace {
  @Prop(TypeRef(documents.class.DocumentSpaceType), documents.string.DocumentSpaceType)
  declare type: Ref<DocumentSpaceType>
}

@Model(documents.class.DocumentSpaceType, core.class.SpaceType)
export class TDocumentSpaceType extends TSpaceType implements DocumentSpaceType {
  @Prop(TypeRef(documents.class.DocumentSpaceTypeDescriptor), getEmbeddedLabel('Descriptor'))
  declare descriptor: Ref<DocumentSpaceTypeDescriptor>

  @Prop(TypeRef(core.class.Class), getEmbeddedLabel('Target Class'))
  declare targetClass: Ref<Class<DocumentSpace>>

  @Prop(TypeBoolean(), getEmbeddedLabel('Projects'))
    projects!: boolean
}

@Model(documents.class.DocumentSpaceTypeDescriptor, core.class.SpaceTypeDescriptor)
export class TDocumentSpaceTypeDescriptor extends TSpaceTypeDescriptor implements DocumentSpaceTypeDescriptor {
  projectClass?: Ref<Class<Project>>
  withProjects?: boolean
}

@Model(documents.class.OrgSpace, documents.class.DocumentSpace)
export class TOrgSpace extends TDocumentSpace implements OrgSpace {}

@Model(documents.class.ExternalSpace, documents.class.DocumentSpace)
export class TExternalSpace extends TDocumentSpace implements ExternalSpace {}

@Model(documents.class.Project, core.class.Doc, DOMAIN_DOCUMENTS)
export class TProject extends TDoc implements Project {
  @Prop(TypeRef(documents.class.DocumentSpace), documents.string.Space)
  @Index(IndexKind.Indexed)
  declare space: Ref<DocumentSpace>

  @Prop(TypeString(), documents.string.Name)
  @Index(IndexKind.FullText)
  @ReadOnly()
    name!: string

  @Prop(TypeBoolean(), documents.string.Readonly)
  @ReadOnly()
  @Hidden()
    readonly!: boolean
}

@Model(documents.class.DocumentMeta, core.class.Doc, DOMAIN_DOCUMENTS)
@UX(documents.string.Document)
export class TDocumentMeta extends TDoc implements DocumentMeta {
  @Prop(Collection(documents.class.Document), documents.string.Documents)
    documents!: CollectionSize<Document>

  @Prop(TypeString(), documents.string.Title)
  @Index(IndexKind.FullText)
    title!: string
}

@Model(documents.class.ProjectMeta, core.class.Doc, DOMAIN_DOCUMENTS)
@UX(documents.string.Project)
export class TProjectMeta extends TDoc implements ProjectMeta {
  @Prop(TypeRef(documents.class.Project), documents.string.Project)
  @Index(IndexKind.Indexed)
    project!: Ref<Project>

  @Prop(TypeRef(documents.class.DocumentMeta), documents.string.Document)
  @Index(IndexKind.Indexed)
  @Hidden()
    meta!: Ref<DocumentMeta>

  @Prop(ArrOf(TypeRef(documents.class.DocumentMeta)), documents.string.Path)
    path!: Ref<DocumentMeta>[]

  @Prop(TypeRef(documents.class.DocumentMeta), documents.string.Parent)
  @Index(IndexKind.Indexed)
    parent!: Ref<DocumentMeta>

  // @Prop(TypeRef(documents.class.Document), documents.string.Document)
  // @Index(IndexKind.Indexed)
  //   head!: Ref<HierarchyDocument>

  @Prop(Collection(documents.class.ProjectDocument), documents.string.Documents)
    documents!: CollectionSize<ProjectDocument>

  @Index(IndexKind.Indexed)
  @Hidden()
    rank!: Rank
}

@Model(documents.class.ProjectDocument, core.class.AttachedDoc, DOMAIN_DOCUMENTS)
@UX(documents.string.Document)
export class TProjectDocument extends TAttachedDoc implements ProjectDocument {
  @Prop(TypeRef(core.class.Space), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<DocumentSpace>

  @Prop(TypeRef(documents.class.ProjectMeta), documents.string.Project)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare attachedTo: Ref<ProjectMeta>

  @Prop(TypeString(), core.string.Collection)
  @Hidden()
  override collection: 'documents' = 'documents'

  @Prop(TypeRef(documents.class.Project), documents.string.Project)
  @Index(IndexKind.Indexed)
    project!: Ref<Project>

  @Prop(TypeRef(documents.class.Project), documents.string.Project)
  @Hidden()
    initial!: Ref<Project>

  @Prop(TypeRef(documents.class.Document), documents.string.Document)
  @Index(IndexKind.Indexed)
    document!: Ref<HierarchyDocument>
}

@Model(documents.class.Document, core.class.Doc, DOMAIN_DOCUMENTS)
@UX(documents.string.Document, documents.icon.Document)
export class TDocument extends TDoc implements Document {
  @Prop(TypeRef(core.class.Space), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<DocumentSpace>

  @Prop(TypeRef(documents.mixin.DocumentTemplate), documents.string.DocumentTemplate)
  @Hidden()
    template?: Ref<DocumentTemplate>

  @Prop(TypeString(), documents.string.Title)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeString(), documents.string.Title)
  @Index(IndexKind.FullText)
    code!: string

  @Prop(TypeString(), documents.string.Code)
  @Index(IndexKind.FullText)
    prefix!: string

  @Prop(TypeNumber(), documents.string.Number)
  @Hidden()
    seqNumber!: number

  @Prop(TypeNumber(), documents.string.Major)
    major!: number

  @Prop(TypeNumber(), documents.string.Minor)
    minor!: number

  @Prop(TypeRef(documents.class.DocumentCategory), documents.string.Category)
    category?: Ref<DocumentCategory>

  @Prop(TypeRef(contact.mixin.Employee), documents.string.Author)
    author?: Ref<Employee>

  @Prop(TypeRef(contact.mixin.Employee), documents.string.Owner)
    owner?: Ref<Employee>

  @Prop(TypeDocumentState(), documents.string.Status)
    state!: DocumentState

  @Prop(TypeCollaborativeDoc(), documents.string.CollaborativeDocument)
    content!: MarkupBlobRef | null

  @Prop(Collection(tags.class.TagReference), documents.string.Labels)
    labels?: CollectionSize<TagReference>

  @Prop(TypeString(), documents.string.MetaAbstract)
  @Index(IndexKind.FullText)
    abstract?: string

  @Prop(TypeNumber(), documents.string.Number)
  @Hidden()
    commentSequence!: number

  @Prop(Collection(documents.class.DocumentComment), chunter.string.Comments)
    comments?: CollectionSize<DocumentComment>

  @Prop(Collection(documents.class.DocumentSnapshot), documents.string.Snapshots)
    snapshots?: CollectionSize<DocumentSnapshot>

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: CollectionSize<Attachment>
}

@Model(documents.class.HierarchyDocument, documents.class.Document)
@UX(documents.string.Document, documents.icon.Document)
export class THierarchyDocument extends TDocument implements HierarchyDocument {
  @Prop(TypeRef(documents.class.DocumentMeta), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  @Hidden()
    attachedTo!: Ref<DocumentMeta>

  @Prop(TypeRef(core.class.Class), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  @Hidden()
    attachedToClass!: Ref<Class<DocumentMeta>>

  @Prop(TypeString(), core.string.Collection)
  @Hidden()
    collection!: 'documents'
}

@Mixin(documents.mixin.DocumentTemplate, documents.class.Document)
@UX(documents.string.DocumentTemplate, documents.icon.Document)
export class TDocumentTemplate extends TDocument implements DocumentTemplate {
  @Prop(TypeNumber(), core.string.Collection)
  @Hidden()
    sequence!: number

  @Prop(TypeString(), documents.string.DocumentPrefix)
  @Index(IndexKind.FullText)
    docPrefix!: string
}

@Mixin(documents.mixin.DocumentTraining, documents.class.Document)
@UX(training.string.Training, training.icon.Training)
export class TDocumentTraining extends TDocument implements DocumentTraining {
  @Prop(TypeBoolean(), documents.string.DocumentTrainingEnabled, { defaultValue: false })
    enabled: boolean = false

  @Prop(TypeRef(training.class.Training), training.string.Training, { defaultValue: null })
    training: Ref<Training> | null = null

  @Prop(ArrOf(TypeRef(core.class.Role)), training.string.TrainingRequestRoles, { defaultValue: [] })
    roles: Array<Ref<Role>> = []

  @Prop(ArrOf(TypeRef(contact.mixin.Employee)), training.string.TrainingRequestTrainees, { defaultValue: [] })
    trainees: TrainingRequest['trainees'] = []

  @Prop(TypeNumber(), training.string.TrainingRequestMaxAttempts, { defaultValue: null })
    maxAttempts: TrainingRequest['maxAttempts'] = null

  @Prop(TypeNumber(), documents.string.DocumentTrainingDueDays, { defaultValue: null })
    dueDays: number | null = null
}

@Model(documents.class.DocumentCategory, core.class.Doc, DOMAIN_DOCUMENTS)
@UX(documents.string.Category)
export class TDocumentCategory extends TDoc implements DocumentCategory {
  @Prop(TypeRef(core.class.TypedSpace), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<TypedSpace>

  @Prop(TypeString(), documents.string.Code)
  @Index(IndexKind.FullText)
    code!: string

  @Prop(TypeString(), documents.string.Title)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeMarkup(), documents.string.Description)
  @Index(IndexKind.FullText)
    description?: string

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: CollectionSize<Attachment>
}

@Model(documents.class.ControlledDocument, documents.class.HierarchyDocument)
@UX(
  documents.string.ControlledDocument,
  documents.icon.Document,
  undefined,
  undefined,
  undefined,
  documents.string.Documents
)
export class TControlledDocument extends THierarchyDocument implements ControlledDocument {
  @Prop(Collection(documents.class.DocumentRequest), documents.string.Requests)
  @Hidden()
    requests!: CollectionSize<DocumentRequest>

  @Prop(ArrOf(TypeRef(contact.mixin.Employee)), documents.string.Reviewers)
    reviewers!: Ref<Employee>[]

  @Prop(ArrOf(TypeRef(contact.mixin.Employee)), documents.string.Approvers)
    approvers!: Ref<Employee>[]

  @Prop(ArrOf(TypeRef(contact.mixin.Employee)), documents.string.CoAuthors)
    coAuthors!: Ref<Employee>[]

  @Prop(TypeNumber(), documents.string.ReviewInterval)
    reviewInterval?: number

  @Prop(TypeControlledDocumentState(), documents.string.ControlledStatus)
    controlledState?: ControlledDocumentState

  @Prop(TypeDate(DateRangeMode.DATE), documents.string.EffectiveDate)
    effectiveDate?: Timestamp

  @Prop(TypeDate(DateRangeMode.DATE), documents.string.PlannedEffectiveDate)
  @Hidden()
    plannedEffectiveDate!: Timestamp

  @Prop(TypeRef(documents.class.Document), documents.string.ChangeControl)
  @Hidden()
    changeControl!: Ref<ChangeControl>

  @Prop(Collection(time.class.ToDo), getEmbeddedLabel('Action Items'))
    todos?: CollectionSize<ToDo>
}

@Model(documents.class.ChangeControl, core.class.Doc, DOMAIN_DOCUMENTS)
@UX(documents.string.ChangeControl)
export class TChangeControl extends TDoc implements ChangeControl {
  @Prop(TypeString(), documents.string.Description)
  @Index(IndexKind.FullText)
    description!: string

  @Prop(TypeString(), documents.string.Reason)
  @Index(IndexKind.FullText)
    reason!: string

  @Prop(TypeString(), documents.string.ImpactAnalysis)
    impact!: string

  @Prop(ArrOf(TypeRef(documents.class.Document)), documents.string.ImpactedDocuments)
    impactedDocuments!: Ref<Document>[]
}

@Model(documents.class.DocumentSnapshot, core.class.AttachedDoc, DOMAIN_DOCUMENTS)
@UX(documents.string.Snapshot)
export class TDocumentSnapshot extends TAttachedDoc implements DocumentSnapshot {
  @Prop(TypeString(), documents.string.Name)
    name?: string

  @Prop(TypeCollaborativeDoc(), documents.string.CollaborativeDocument)
  @Hidden()
    content!: MarkupBlobRef | null

  @Prop(TypeDocumentState(), documents.string.Status)
    state?: DocumentState
}

@Model(documents.class.ControlledDocumentSnapshot, documents.class.DocumentSnapshot)
@UX(documents.string.ControlledSnapshot)
export class TControlledDocumentSnapshot extends TDocumentSnapshot implements ControlledDocumentSnapshot {
  @Prop(TypeControlledDocumentState(), documents.string.Status)
    controlledState!: ControlledDocumentState
}

@Model(documents.class.DocumentComment, chunter.class.ChatMessage)
export class TDocumentComment extends TChatMessage implements DocumentComment {
  @Prop(TypeString(), documents.string.ID)
    nodeId?: string

  @Prop(TypeBoolean(), documents.string.Resolve)
    resolved?: boolean

  @Prop(TypeNumber(), documents.string.Index)
    index?: number
}

@Model(documents.class.DocumentRequest, request.class.Request)
@UX(documents.string.DocumentRequest)
export class TDocumentRequest extends TRequest implements DocumentRequest {}

@Model(documents.class.DocumentReviewRequest, documents.class.DocumentRequest)
@UX(documents.string.DocumentReviewRequest)
export class TDocumentReviewRequest extends TDocumentRequest implements DocumentReviewRequest {}

@Model(documents.class.DocumentApprovalRequest, documents.class.DocumentRequest)
@UX(documents.string.DocumentApprovalRequest)
export class TDocumentApprovalRequest extends TDocumentRequest implements DocumentApprovalRequest {}

@Mixin(documents.mixin.DocumentSpaceTypeData, documents.class.DocumentSpace)
@UX(getEmbeddedLabel('Default Documents'), documents.icon.Document)
export class TDocumentSpaceTypeData extends TDocumentSpace implements RolesAssignment {
  [key: Ref<Role>]: AccountUuid[]
}

/**
 * @public
 */
export function TypeDocumentState (): Type<DocumentState> {
  return { _class: documents.class.TypeDocumentState, label: documents.string.Status }
}

@UX(documents.string.Status)
@Model(documents.class.TypeDocumentState, core.class.Type)
export class TTypeDocumentState extends TType {}

/**
 * @public
 */
export function TypeControlledDocumentState (): Type<ControlledDocumentState> {
  return { _class: documents.class.TypeControlledDocumentState, label: documents.string.ControlledStatus }
}

@UX(documents.string.ControlledStatus)
@Model(documents.class.TypeControlledDocumentState, core.class.Type)
export class TTypeControlledDocumentState extends TType {}
