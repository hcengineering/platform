<!--
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
-->
<script lang="ts">
  import { Analytics } from '@hcengineering/analytics'
  import { Card, CardEvents } from '@hcengineering/card'
  import core, { Class, Data, Doc, fillDefaults, MarkupBlobRef, Ref, SortingOrder } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { makeRank } from '@hcengineering/rank'
  import {
    ButtonIcon,
    getCurrentLocation,
    IconAdd,
    navigate
  } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import card from '../plugin'

  export let _class: Ref<Class<Doc>> | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  async function createCard (): Promise<void> {
    if (_class === undefined) return
    const lastOne = await client.findOne(card.class.Card, {}, { sort: { rank: SortingOrder.Descending } })
    const title = await translate(card.string.Card, {})

    const data: Data<Card> = {
      title,
      rank: makeRank(lastOne?.rank, undefined),
      content: '' as MarkupBlobRef,
      parentInfo: [],
      blobs: {}
    }

    const filledData = fillDefaults(hierarchy, data, _class)

    const _id = await client.createDoc(_class, core.space.Workspace, filledData)

    Analytics.handleEvent(CardEvents.CardCreated)

    const loc = getCurrentLocation()
    loc.path[3] = _id
    loc.path.length = 4
    navigate(loc)
  }
</script>

<ButtonIcon
  kind="primary"
  icon={IconAdd}
  size="small"
  dataId={'btnCreateCard'}
  on:click={createCard}
/>
