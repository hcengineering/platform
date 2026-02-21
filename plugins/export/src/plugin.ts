//
// Copyright © 2025 Hardcore Engineering Inc.
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

import type { Class, Client, Doc, Ref } from '@hcengineering/core'
import { type IntlString, type Metadata, type Plugin, plugin, type Resource, type Asset } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import type { NotificationGroup, NotificationType } from '@hcengineering/notification'
import type { ExportResultRecord } from './types'

export const exportId = 'export' as Plugin

export const exportPlugin = plugin(exportId, {
  ids: {
    ImportNotificationGroup: '' as Ref<NotificationGroup>,
    ImportedDocumentsNotification: '' as Ref<NotificationType>
  },
  class: {
    ExportResultRecord: '' as Ref<Class<ExportResultRecord>>
  },
  string: {
    Export: '' as IntlString,
    ExportCompleted: '' as IntlString,
    ExportFailed: '' as IntlString,
    ExportToWorkspace: '' as IntlString,
    TargetWorkspace: '' as IntlString,
    ImportCompleted: '' as IntlString,
    ImportToWorkspaceNotificationMessage: '' as IntlString,
    SourceWorkspace: '' as IntlString,
    ExportedCount: '' as IntlString,
    ExportedDocumentIds: '' as IntlString,
    DocumentsImportedFromWorkspace: '' as IntlString,
    ExportedDocumentClass: '' as IntlString,
    Import: '' as IntlString,
    ImportedDocuments: '' as IntlString,
    ExportResultRecordTitle: '' as IntlString
  },
  component: {
    ExportButton: '' as AnyComponent,
    ExportSettings: '' as AnyComponent,
    ExportToWorkspaceModal: '' as AnyComponent,
    ExportResultPanel: '' as AnyComponent
  },
  icon: {
    Export: '' as Asset
  },
  metadata: {
    ExportUrl: '' as Metadata<string>
  },
  function: {
    ExportResultTitleProvider: '' as Resource<(client: Client, ref: Ref<Doc>, doc?: Doc) => Promise<string>>
  }
})

export default exportPlugin
