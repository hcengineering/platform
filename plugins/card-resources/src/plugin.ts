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

import card, { cardId } from '@hcengineering/card'
import { type Ref } from '@hcengineering/core'
import { type IntlString, mergeIds, type Resource } from '@hcengineering/platform'
import { type ObjectSearchCategory, type ObjectSearchFactory } from '@hcengineering/presentation'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import { type Viewlet } from '@hcengineering/view'

export default mergeIds(cardId, card, {
  component: {
    ManageMasterTags: '' as AnyComponent,
    ManageMasterTagsContent: '' as AnyComponent,
    ManageMasterTagsTools: '' as AnyComponent,
    MasterTags: '' as AnyComponent,
    CreateTag: '' as AnyComponent,
    CardPresenter: '' as AnyComponent,
    EditCard: '' as AnyComponent,
    Main: '' as AnyComponent,
    GeneralSection: '' as AnyComponent,
    ProperitiesSection: '' as AnyComponent,
    TagsSection: '' as AnyComponent,
    ChildsSection: '' as AnyComponent,
    RelationsSection: '' as AnyComponent,
    SetParentActionPopup: '' as AnyComponent
  },
  completion: {
    CardQuery: '' as Resource<ObjectSearchFactory>,
    CardCategory: '' as Ref<ObjectSearchCategory>
  },
  viewlet: {
    CardTable: '' as Ref<Viewlet>,
    CardList: '' as Ref<Viewlet>
  },
  string: {
    CreateMasterTag: '' as IntlString,
    CreateTag: '' as IntlString,
    CreateCard: '' as IntlString,
    Content: '' as IntlString,
    Parent: '' as IntlString,
    CardLibrary: '' as IntlString,
    ConfigDescription: '' as IntlString,
    SearchCard: '' as IntlString,
    MinimizeAll: '' as IntlString,
    ExpandAll: '' as IntlString,
    DeleteTag: '' as IntlString,
    DeleteTagConfirm: '' as IntlString,
    DeleteMasterTag: '' as IntlString,
    DeleteMasterTagConfirm: '' as IntlString,
    TagRelations: '' as IntlString,
    UnsetParent: '' as IntlString,
    SetParent: '' as IntlString,
    CreateChild: '' as IntlString,
    Children: '' as IntlString
  }
})
