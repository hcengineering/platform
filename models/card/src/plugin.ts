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

import { cardId } from '@hcengineering/card'
import card from '@hcengineering/card-resources/src/plugin'
import type { Client, Doc, Ref } from '@hcengineering/core'
import {} from '@hcengineering/core'
import { mergeIds, type Resource } from '@hcengineering/platform'
import { type Location, type ResolvedLocation } from '@hcengineering/ui/src/types'
import { type LocationData } from '@hcengineering/workbench'
import { type ActionCategory, type Action, type ViewAction } from '@hcengineering/view'
import { type TagCategory, type TagElement } from '@hcengineering/tags'

export default mergeIds(cardId, card, {
  app: {
    Card: '' as Ref<Doc>
  },
  actionImpl: {
    DeleteMasterTag: '' as ViewAction,
    EditSpace: '' as ViewAction
  },
  action: {
    DeleteMasterTag: '' as Ref<Action>,
    SetParent: '' as Ref<Action<Doc, any>>,
    UnsetParent: '' as Ref<Action<Doc, any>>
  },
  category: {
    Card: '' as Ref<ActionCategory>,
    Labels: '' as Ref<TagCategory>
  },
  ids: {
    MasterTags: '' as Ref<Doc>,
    ManageMasterTags: '' as Ref<Doc>,
    TagRelations: '' as Ref<Doc>
  },
  resolver: {
    Location: '' as Resource<(loc: Location) => Promise<ResolvedLocation | undefined>>,
    LocationData: '' as Resource<(loc: Location) => Promise<LocationData>>
  },
  function: {
    CardTitleProvider: '' as Resource<(client: Client, ref: Ref<Doc>, doc?: Doc) => Promise<string>>,
    CardIdProvider: '' as Resource<(client: Client, ref: Ref<Doc>, doc?: Doc) => Promise<string>>,
    GetCardLink: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>
  },
  label: {
    Subscribed: '' as Ref<TagElement>,
    NewMessages: '' as Ref<TagElement>
  }
})
