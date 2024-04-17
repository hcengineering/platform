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

import type { Doc, Ref } from '@hcengineering/core'
import {} from '@hcengineering/core'
import { documentId } from '@hcengineering/document'
import document from '@hcengineering/document-resources/src/plugin'
import { type ObjectSearchCategory, type ObjectSearchFactory } from '@hcengineering/model-presentation'
import { type IntlString, mergeIds, type Resource } from '@hcengineering/platform'
import { type TagCategory } from '@hcengineering/tags'
import { type AnyComponent } from '@hcengineering/ui'
import { type Action, type ActionCategory, type ViewAction } from '@hcengineering/view'

export default mergeIds(documentId, document, {
  component: {
    Documents: '' as AnyComponent,
    DocumentPresenter: '' as AnyComponent,
    NotificationDocumentPresenter: '' as AnyComponent,
    TeamspaceSpacePresenter: '' as AnyComponent,
    Move: '' as AnyComponent,
    DocumentToDoPresenter: '' as AnyComponent,
    DocumentIcon: '' as AnyComponent
  },
  completion: {
    DocumentQuery: '' as Resource<ObjectSearchFactory>,
    DocumentQueryCategory: '' as Ref<ObjectSearchCategory>
  },
  actionImpl: {
    CreateChildDocument: '' as ViewAction,
    CreateDocument: '' as ViewAction,
    EditTeamspace: '' as ViewAction
  },
  action: {
    PublicLink: '' as Ref<Action<Doc, any>>
  },
  category: {
    Document: '' as Ref<ActionCategory>,
    Other: '' as Ref<TagCategory>
  },
  string: {
    ConfigDescription: '' as IntlString,
    ParentDocument: '' as IntlString,
    ChildDocument: '' as IntlString
  }
})
