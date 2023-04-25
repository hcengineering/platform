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

import type { Doc, Ref } from '@hcengineering/core'
import {} from '@hcengineering/core'
import { documentId } from '@hcengineering/document'
import document from '@hcengineering/document-resources/src/plugin'
import { ObjectSearchCategory, ObjectSearchFactory } from '@hcengineering/model-presentation'
import { IntlString, mergeIds, Resource } from '@hcengineering/platform'
import { TagCategory } from '@hcengineering/tags'
import { AnyComponent } from '@hcengineering/ui'
import { ActionCategory } from '@hcengineering/view'

export default mergeIds(documentId, document, {
  component: {
    Documents: '' as AnyComponent,
    DocumentPresenter: '' as AnyComponent,
    DocumentVersionPresenter: '' as AnyComponent,
    DocumentVersions: '' as AnyComponent
  },
  completion: {
    DocumentQuery: '' as Resource<ObjectSearchFactory>,
    DocumentQueryCategory: '' as Ref<ObjectSearchCategory>
  },
  category: {
    Document: '' as Ref<ActionCategory>,
    Other: '' as Ref<TagCategory>
  },
  viewlet: {
    TableDocument: '' as Ref<Doc>
  },
  string: {
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString
  }
})
