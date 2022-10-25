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

import { Employee } from '@hcengineering/contact'
import { AttachedDoc, Class, Doc, Markup, Ref, Space } from '@hcengineering/core'
import type { Asset, Plugin } from '@hcengineering/platform'
import { IntlString, plugin } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui'

/**
 * @public
 */
export interface Step {
  stepType: string
  from: number
  to: number
  slice: any
}

/**
 * @public
 * Document in transient state describe a list of editing documents.
 */
export interface RichDocumentContent extends AttachedDoc {
  steps: Step[]
  version: number
}

/**
 * @public
 */
export interface Document extends Doc {
  name: string

  // Rich content version edit counter
  editSequence: number

  // Rich Document content collection indicator.
  content: number

  // Collection of versions of this document.
  versions: number

  versionCounter: number

  attachments?: number
  comments?: number
  labels?: number

  // List of reponsible persons, for document.
  responsible: Ref<Employee>[]
}

/**
 * @public
 */
export interface DocumentVersion extends AttachedDoc {
  version: number
  sequenceNumber: number
  content: Markup
  approved: Ref<Employee> | null
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
    RichDocumentContent: '' as Ref<Class<RichDocumentContent>>
  },
  component: {
    CreateDocument: '' as AnyComponent
  },
  icon: {
    DocumentApplication: '' as Asset,
    Document: '' as Asset
  },
  space: {
    Documents: '' as Ref<Space>
  },
  app: {
    Documents: '' as Ref<Doc>
  },
  string: {
    CreateDocument: '' as IntlString
  }
})

export default documentPlugin
