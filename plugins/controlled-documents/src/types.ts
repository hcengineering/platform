//
// Copyright © 2022-2023 Hardcore Engineering Inc.
//
import { Attachment } from '@hcengineering/attachment'
import { ChatMessage } from '@hcengineering/chunter'
import { Employee } from '@hcengineering/contact'
import {
  type AttachedDoc,
  type Class,
  type CollectionSize,
  type MarkupBlobRef,
  type Doc,
  type Markup,
  type Ref,
  type Role,
  type TypedSpace,
  type Timestamp,
  SpaceType,
  SpaceTypeDescriptor,
  Rank
} from '@hcengineering/core'
import { type TagReference } from '@hcengineering/tags'
import { Request } from '@hcengineering/request'
import type { Training, TrainingRequest } from '@hcengineering/training'

/**
 * @public
 *
 * Space for non-document content
 */
export interface DocumentSpace extends TypedSpace {
  type: Ref<DocumentSpaceType>
}

/**
 * @public
 */
export interface DocumentSpaceType extends SpaceType {
  descriptor: Ref<DocumentSpaceTypeDescriptor>
  targetClass: Ref<Class<DocumentSpace>>
  // Whether the space is allowed to contain projects
  projects: boolean
}

/**
 * @public
 */
export interface DocumentSpaceTypeDescriptor extends SpaceTypeDescriptor {
  projectClass?: Ref<Class<Project>>
  withProjects?: boolean // Default value for projects in the space type
}

/**
 * @public
 *
 * Documents space for internal organization documents
 */
export interface OrgSpace extends DocumentSpace {}

/**
 * @public
 *
 * Documents space for external documents
 */
export interface ExternalSpace extends DocumentSpace {}

/**
 * @public
 */
export interface Project<T extends DocumentSpace = DocumentSpace> extends Doc<T> {
  name: string
  readonly: boolean
}

export interface DocumentMeta extends Doc {
  documents: CollectionSize<Document> // A collection of Document's versions
  title: string
}

/**
 * @public
 *
 * Specifies document in the project documents hierarchy
 */
export interface ProjectMeta extends Doc {
  project: Ref<Project>

  meta: Ref<DocumentMeta> // Related document meta.
  path: Ref<DocumentMeta>[] // Array of parent documents in the hierarchy. The first one is the direct parent, the last one is the hierarchy root.
  parent: Ref<DocumentMeta> // Direct parent in the hierarchy

  // head: Ref<HierarchyDocument>

  documents: CollectionSize<ProjectDocument>

  rank: Rank
}

/**
 * @public
 *
 * Reference between project meta and document version
 */
export interface ProjectDocument extends AttachedDoc<ProjectMeta, 'documents', DocumentSpace> {
  project: Ref<Project>
  initial: Ref<Project>
  document: Ref<HierarchyDocument>
}

/**
 * @public
 *
 * Primary document class used to describe any (library) document in the system.
 * Attached to higher-order document.
 */
export interface Document extends Doc<DocumentSpace> {
  template?: Ref<DocumentTemplate> // Used as a starting point - as a default content/metadata for a document
  title: string
  code: string
  prefix: string
  seqNumber: number
  major: number
  minor: number
  category?: Ref<DocumentCategory>
  author?: Ref<Employee> // Employee who created/released the document
  owner?: Ref<Employee> // Employee responsible for working on the document
  state: DocumentState
  content: MarkupBlobRef | null
  labels?: CollectionSize<TagReference> // A collection of attached tags(labels)
  abstract?: string
  commentSequence: number // Used to enumerate the comments across revisions of the working copy of the document
  comments?: CollectionSize<DocumentComment> // A collection of document comments to the working copy of the document
  snapshots?: CollectionSize<DocumentSnapshot> // A collection of document snapshots
  attachments?: CollectionSize<Attachment> // A collection of attachments inlined into the document. E.g. pictures/documents.
}

/**
 * @public
 *
 * Document snapshot attached to collaborative documents
 */
export interface DocumentSnapshot extends AttachedDoc {
  name?: string
  content: MarkupBlobRef | null
  state?: DocumentState
}

/**
 * @public
 *
 * Document snapshot extended with collaborative state
 */
export interface ControlledDocumentSnapshot extends DocumentSnapshot {
  controlledState?: ControlledDocumentState
}

/**
 * @public
 * Document within a documents hierarchy.
 *
 */
export interface HierarchyDocument extends Document, AttachedDoc<DocumentMeta, 'documents', DocumentSpace> {}

/**
 * @public
 *
 * Document template mixin. Contains additional data for a document that is supposed
 * to be used as a template for other documents.
 */
export interface DocumentTemplate extends Document {
  sequence: number
  docPrefix: string
}

/**
 * @public
 *
 * Categorizes the document. Used for filtering/permissions.
 * Former "Domain".
 */
export interface DocumentCategory extends Doc<TypedSpace> {
  code: string // Category code used as an acronym of the category and visible to the end user
  title: string
  description?: Markup
  attachments?: CollectionSize<Attachment>
}

/**
 * @public
 *
 * Reflects the state of the document - whether it is work in progress/released/etc.
 */
export enum DocumentState {
  Draft = 'draft',
  Effective = 'effective',
  Archived = 'archived',
  Deleted = 'deleted'
}

/**
 * @public
 *
 * A document which lifecycle is strictly controlled
 */
export interface ControlledDocument extends HierarchyDocument {
  requests: CollectionSize<DocumentRequest> // A collection of attached review and approval requests for the document
  reviewers: Ref<Employee>[]
  approvers: Ref<Employee>[]
  coAuthors: Ref<Employee>[]
  reviewInterval?: number // A period (in months) after which the released document must be reviewed again
  controlledState?: ControlledDocumentState
  plannedEffectiveDate?: Timestamp // A date when the document is planned to be released as an effective document
  effectiveDate?: Timestamp // A date when the document was released
  changeControl: Ref<ChangeControl> // An entitiy describing the reason for this document (version)
}

/**
 * @public
 *
 * A
 */
export interface ChangeControl extends Doc {
  description: string
  reason: string
  impact: string
  impactedDocuments: Ref<Document>[]
}

/**
 * @public
 *
 * Extended document state with additional states for controlled documents
 */
export enum ControlledDocumentState {
  InReview = 'inReview',
  Reviewed = 'reviewed',
  InApproval = 'inApproval',
  Approved = 'approved',
  Rejected = 'rejected',
  ToReview = 'toReview'
}

/**
 * @public
 * Generic sequence attached to a class for cases when a single increment goes through all instances of the class.
 */
export interface Sequence extends Doc {
  attachedTo: Ref<Class<Doc>>
  sequence: number
}

/**
 * @public
 * Base class for all document related requests
 */
export interface DocumentRequest extends Request {}

/**
 * @public
 * Request to review a controlled document
 */
export interface DocumentReviewRequest extends DocumentRequest {}

/**
 * @public
 * Request for a controlled document approval
 */
export interface DocumentApprovalRequest extends DocumentRequest {}

/**
 * @public
 *
 * Attached to Document
 * Could be attached to particular node or the whole document
 */
export interface DocumentComment extends ChatMessage {
  nodeId?: string // If empty - attached to the whole document
  resolved?: boolean
  index?: number
}

/**
 * @public
 *
 * Training mixin, contains additional data on a training bound to document.
 */
export interface DocumentTraining extends Document {
  enabled: boolean
  training: Ref<Training> | null
  roles: Array<Ref<Role>>
  trainees: TrainingRequest['trainees']
  maxAttempts: TrainingRequest['maxAttempts']
  dueDays: number | null
}
