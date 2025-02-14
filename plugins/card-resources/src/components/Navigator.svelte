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
  import { Card, CardEvents, cardId, MasterTag } from '@hcengineering/card'
  import core, { Class, Data, Doc, fillDefaults, MarkupBlobRef, Ref, SortingOrder } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { makeRank } from '@hcengineering/rank'
  import {
    Button,
    deviceOptionsStore as deviceInfo,
    getCurrentLocation,
    IconAdd,
    navigate,
    Scroller
  } from '@hcengineering/ui'
  import { NavFooter, NavHeader, SavedView } from '@hcengineering/workbench-resources'
  import card from '../plugin'
  import TagHierarchy from './TagHierarchy.svelte'

  export let _class: Ref<Class<Doc>>

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let classes: MasterTag[] = []
  let allClasses: MasterTag[] = []

  function fillClasses (tags: MasterTag[]): void {
    classes = tags.filter((it) => it.extends === card.class.Card)
  }

  const query = createQuery()
  query.query(card.class.MasterTag, { _class: card.class.MasterTag }, (res) => {
    allClasses = res
    fillClasses(res)
  })

  async function createCard (): Promise<void> {
    const lastOne = await client.findOne(card.class.Card, {}, { sort: { rank: SortingOrder.Descending } })
    const title = await translate(card.string.Card, {})

    const data: Data<Card> = {
      title,
      rank: makeRank(lastOne?.rank, undefined),
      content: '' as MarkupBlobRef
    }

    const filledData = fillDefaults(hierarchy, data, _class)

    const _id = await client.createDoc(_class ?? card.class.Card, core.space.Workspace, filledData)

    Analytics.handleEvent(CardEvents.CardCreated)

    const loc = getCurrentLocation()
    loc.path[3] = _id
    loc.path.length = 4
    navigate(loc)
  }

  let menuSelection: boolean = false
</script>

<div
  class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal' ? 'portrait' : 'landscape'} border-left"
  class:fly={$deviceInfo.navigator.float}
>
  <div class="antiPanel-wrap__content hulyNavPanel-container">
    <NavHeader label={card.string.Cards} />

    <div class="antiNav-subheader">
      <Button
        icon={IconAdd}
        label={card.string.CreateCard}
        disabled={allClasses.length === 0 || _class === undefined}
        justify={'left'}
        width={'100%'}
        kind={'primary'}
        gap={'large'}
        on:click={createCard}
      />
    </div>

    <SavedView alias={cardId} on:select={(res) => (menuSelection = res.detail)} />

    {#if classes.length > 0}
      <div class="antiNav-divider line" />

      <Scroller shrink>
        <TagHierarchy bind:_class deselect={menuSelection} {classes} {allClasses} on:select />
      </Scroller>
    {/if}

    <div class="mt-2" />

    <NavFooter split />
  </div>
</div>
