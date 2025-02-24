//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { documentsId } from '@hcengineering/controlled-documents'
import documents from '@hcengineering/controlled-documents-resources/src/plugin'
import type { Client, Doc, Ref } from '@hcengineering/core'
import { type ObjectSearchCategory, type ObjectSearchFactory } from '@hcengineering/model-presentation'
import { mergeIds, type Resource } from '@hcengineering/platform'
import { type TagCategory } from '@hcengineering/tags'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import { type ActionCategory, type ViewAction } from '@hcengineering/view'
import { type NotificationType, type NotificationGroup } from '@hcengineering/notification'
import { type TextActionVisibleFunction, type TextActionFunction } from '@hcengineering/text-editor'

export default mergeIds(documentsId, documents, {
  component: {
    DocumentVersions: '' as AnyComponent,
    EditDocumentContent: '' as AnyComponent,
    EditDocumentAttachment: '' as AnyComponent,

    // new model components
    CategoryPresenter: '' as AnyComponent,
    Categories: '' as AnyComponent,
    DocumentTemplates: '' as AnyComponent,
    StateFilterValuePresenter: '' as AnyComponent,
    ControlledStateFilterValuePresenter: '' as AnyComponent,

    // Projects
    Projects: '' as AnyComponent
  },
  completion: {
    DocumentMetaQuery: '' as Resource<ObjectSearchFactory>,
    DocumentMetaCategory: '' as Ref<ObjectSearchCategory>
  },
  category: {
    Document: '' as Ref<ActionCategory>,
    Other: '' as Ref<TagCategory>,
    OtherTemplate: '' as Ref<TagCategory>
  },
  function: {
    DocumentIdentifierProvider: '' as Resource<
      <T extends Doc>(client: Client, ref: Ref<T>, doc?: T) => Promise<string>
    >,
    Comment: '' as Resource<TextActionFunction>,
    IsCommentVisible: '' as Resource<TextActionVisibleFunction>
  },
  actionImpl: {
    CreateChildDocument: '' as ViewAction,
    CreateChildTemplate: '' as ViewAction,
    CreateChildFolder: '' as ViewAction,
    RenameFolder: '' as ViewAction,
    DeleteFolder: '' as ViewAction,
    CreateDocument: '' as ViewAction,
    CreateTemplate: '' as ViewAction,
    CreateFolder: '' as ViewAction,
    TransferTemplate: '' as ViewAction,
    DeleteDocument: '' as ViewAction,
    ArchiveDocument: '' as ViewAction,
    MakeDocumentObsolete: '' as ViewAction,
    TransferDocument: '' as ViewAction,
    EditDocSpace: '' as ViewAction
  },
  viewlet: {
    TableDocument: '' as Ref<Doc>,
    ListDocument: '' as Ref<Doc>,
    TableDocumentTemplate: '' as Ref<Doc>,
    TableDocumentDomain: '' as Ref<Doc>
  },
  notification: {
    DocumentsNotificationGroup: '' as Ref<NotificationGroup>,
    ContentNotification: '' as Ref<NotificationType>,
    StateNotification: '' as Ref<NotificationType>
  }
})
