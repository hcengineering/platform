//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
import { AttachedDoc, Class, CollaborativeDoc, Doc, Ref, Space } from '@hcengineering/core'
import type { Asset, Plugin, Resource } from '@hcengineering/platform'
import { Preference } from '@hcengineering/preference'
import { IntlString, plugin } from '@hcengineering/platform'
import type { AnyComponent, Location, ResolvedLocation } from '@hcengineering/ui'
import { Action, IconProps } from '@hcengineering/view'
import { NotificationGroup, NotificationType } from '@hcengineering/notification'

/**
 * @public
 */
export interface Teamspace extends Space, IconProps {}

/**
 * @public
 */
export interface Document extends AttachedDoc<Document, 'children', Teamspace>, IconProps {
  attachedTo: Ref<Document>

  name: string
  content: CollaborativeDoc

  snapshots?: number

  attachments?: number
  children?: number
  comments?: number
  embeddings?: number
  labels?: number
  references?: number
}

/**
 * @public
 */
export interface DocumentSnapshot extends AttachedDoc<Document, 'snapshots', Teamspace> {
  attachedTo: Ref<Document>
  name: string
  content: CollaborativeDoc
}

/**
 * @public
 */
export interface SavedDocument extends Preference {
  attachedTo: Ref<Document>
}

/**
 * @public
 */
export interface DocumentEmbedding extends Attachment {
  attachedTo: Ref<Document>
  attachedToClass: Ref<Class<Document>>
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
    DocumentSnapshot: '' as Ref<Class<DocumentSnapshot>>,
    DocumentEmbedding: '' as Ref<Class<DocumentEmbedding>>,
    SavedDocument: '' as Ref<Class<SavedDocument>>,
    Teamspace: '' as Ref<Class<Teamspace>>
  },
  component: {
    CreateDocument: '' as AnyComponent,
    DocumentSearchIcon: '' as AnyComponent
  },
  action: {
    CopyDocumentLink: '' as Ref<Action<Doc, any>>,
    CreateChildDocument: '' as Ref<Action>,
    CreateDocument: '' as Ref<Action>,
    EditTeamspace: '' as Ref<Action>
  },
  icon: {
    DocumentApplication: '' as Asset,
    NewDocument: '' as Asset,
    Document: '' as Asset,
    Add: '' as Asset,
    Blank: '' as Asset,
    Videofile: '' as Asset,
    Library: '' as Asset,
    Teamspace: '' as Asset,
    References: '' as Asset,
    History: '' as Asset,
    Star: '' as Asset,
    Starred: '' as Asset
  },
  space: {
    Documents: '' as Ref<Space>
  },
  app: {
    Documents: '' as Ref<Doc>
  },
  resolver: {
    Location: '' as Resource<(loc: Location) => Promise<ResolvedLocation | undefined>>
  },
  string: {
    ConfigLabel: '' as IntlString,
    CreateDocument: '' as IntlString
  },
  ids: {
    NoParent: '' as Ref<Document>,
    DocumentNotificationGroup: '' as Ref<NotificationGroup>,
    ContentNotification: '' as Ref<NotificationType>
  }
})

export default documentPlugin
