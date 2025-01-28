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

import type { Class, Doc, Mixin, Ref, SpaceType, SpaceTypeDescriptor } from '@hcengineering/core'
import { NotificationGroup, NotificationType } from '@hcengineering/notification'
import type { Asset, Plugin, Resource } from '@hcengineering/platform'
import { IntlString, plugin } from '@hcengineering/platform'
import type { AnyComponent, Location, ResolvedLocation } from '@hcengineering/ui'
import { Action } from '@hcengineering/view'
import { Document, DocumentSnapshot, SavedDocument, Teamspace } from './types'

/**
 * @public
 */
export const documentId = 'document' as Plugin

/**
 * @public
 */
export const documentPlugin = plugin(documentId, {
  class: {
    Document: '' as Ref<Class<Document>>,
    DocumentSnapshot: '' as Ref<Class<DocumentSnapshot>>,
    SavedDocument: '' as Ref<Class<SavedDocument>>,
    Teamspace: '' as Ref<Class<Teamspace>>
  },
  mixin: {
    DefaultTeamspaceTypeData: '' as Ref<Mixin<Teamspace>>
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
    Document: '' as Asset,
    DocumentApplication: '' as Asset,
    Add: '' as Asset,
    Teamspace: '' as Asset,
    References: '' as Asset,
    History: '' as Asset,
    Star: '' as Asset,
    Starred: '' as Asset,
    Lock: '' as Asset,
    Unlock: '' as Asset
  },
  app: {
    Documents: '' as Ref<Doc>
  },
  resolver: {
    Location: '' as Resource<(loc: Location) => Promise<ResolvedLocation | undefined>>
  },
  string: {
    ConfigLabel: '' as IntlString,
    CreateDocument: '' as IntlString,
    Documents: '' as IntlString
  },
  ids: {
    NoParent: '' as Ref<Document>,
    DocumentNotificationGroup: '' as Ref<NotificationGroup>,
    ContentNotification: '' as Ref<NotificationType>
  },
  descriptor: {
    TeamspaceType: '' as Ref<SpaceTypeDescriptor>
  },
  spaceType: {
    DefaultTeamspaceType: '' as Ref<SpaceType>
  }
})

export default documentPlugin
