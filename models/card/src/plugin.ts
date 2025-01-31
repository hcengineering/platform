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
import { type ObjectSearchCategory, type ObjectSearchFactory } from '@hcengineering/model-presentation'
import { type Location, type ResolvedLocation } from '@hcengineering/ui'
import { type LocationData } from '@hcengineering/workbench'
import { type Action, type ViewAction } from '@hcengineering/view'

export default mergeIds(cardId, card, {
  app: {
    Card: '' as Ref<Doc>
  },
  actionImpl: {
    DeleteMasterTag: '' as ViewAction
  },
  action: {
    DeleteMasterTag: '' as Ref<Action>
  },
  ids: {
    MasterTags: '' as Ref<Doc>
  },
  completion: {
    CardQuery: '' as Resource<ObjectSearchFactory>,
    CardCategory: '' as Ref<ObjectSearchCategory>
  },
  resolver: {
    Location: '' as Resource<(loc: Location) => Promise<ResolvedLocation | undefined>>,
    LocationData: '' as Resource<(loc: Location) => Promise<LocationData>>
  },
  function: {
    CardTitleProvider: '' as Resource<(client: Client, ref: Ref<Doc>, doc?: Doc) => Promise<string>>,
    CardIdProvider: '' as Resource<(client: Client, ref: Ref<Doc>, doc?: Doc) => Promise<string>>,
    GetCardLink: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>
  }
})
