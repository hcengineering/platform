//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { Attachment } from '@hcengineering/attachment'
import { Employee } from '@hcengineering/contact'
import { AttachedDoc, Class, Doc, Markup, Ref, Space } from '@hcengineering/core'
import type { Asset, Metadata, Plugin } from '@hcengineering/platform'
import { IntlString, plugin } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui'

/**
 * @public
 */
export interface Document extends Doc {
  name: string

  version: number // Latest approved version of document
  latest: number // Latest draft version

  // Collection of versions of this document.
  versions: number

  attachments?: number
  comments?: number
  labels?: number

  // List of authors, who could edit the version until it will be published
  // Combined with reviewers.
  authors: Ref<Employee>[]

  // List of persons who revieded version
  reviewers: Ref<Employee>[]

  // List of persions who approved version.
  approvers: Ref<Employee>[]

  requests: number
}

/**
 * @public
 */
export enum DocumentVersionState {
  Draft,
  Approved,
  Rejected
}
/**
 * @public
 */
export interface DocumentVersion extends AttachedDoc {
  version: number // Uniq version of document.

  description: Markup
  reason: Markup
  impact: Markup

  state: DocumentVersionState

  // Defined only if document being proposed for review or approval
  content: Markup
  contentAttachmentId: Ref<CollaboratorDocument>
  initialContentId: Ref<CollaboratorDocument> | undefined

  // Attachments contain a CollaboratorDocument with content hold in S3
  attachments: number
  comments: number
}

/**
 * A collaborative document handle, with a minio document in collaborative mode.
 * @public
 */
export interface CollaboratorDocument extends Attachment {}

/**
 * @public
 */
export enum DocumentRequestKind {
  Review, // Review requested
  Approve, // Approve requested
  Changes // Changes requested
}
/**
 * @public
 */
export interface DocumentRequest extends AttachedDoc {
  kind: DocumentRequestKind
  assignee: Ref<Employee>
  message?: Markup
}

/**
 * @public
 */
export const documentId = 'document' as Plugin

/**
 * @public
 */
const documentPlugin = plugin(documentId, {
  class: {
    Document: '' as Ref<Class<Document>>,
    DocumentVersion: '' as Ref<Class<DocumentVersion>>,
    DocumentRequest: '' as Ref<Class<DocumentRequest>>,
    CollaboratorDocument: '' as Ref<Class<CollaboratorDocument>>
  },
  component: {
    CreateDocument: '' as AnyComponent
  },
  icon: {
    DocumentApplication: '' as Asset,
    NewDocument: '' as Asset,
    Document: '' as Asset,
    Library: '' as Asset
  },
  space: {
    Documents: '' as Ref<Space>
  },
  app: {
    Documents: '' as Ref<Doc>
  },
  string: {
    CreateDocument: '' as IntlString
  },
  ids: {
    NO_VERSION: '' as Ref<DocumentVersion>
  },
  metadata: {
    CollaboratorUrl: '' as Metadata<string>
  }
})

export default documentPlugin
