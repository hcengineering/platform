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
  import core, { Class, Doc, MarkupBlobRef, Ref, SortingOrder } from '@hcengineering/core'
  import {
    Button,
    IconAdd,
    Scroller,
    NavItem,
    deviceOptionsStore as deviceInfo,
    getCurrentLocation,
    navigate
  } from '@hcengineering/ui'
  import { NavFooter, NavHeader } from '@hcengineering/workbench-resources'
  import { showMenu, NavLink } from '@hcengineering/view-resources'
  import { getClient, createQuery } from '@hcengineering/presentation'
  import { CardEvents, MasterTag } from '@hcengineering/card'
  import { createEventDispatcher } from 'svelte'
  import card from '../plugin'
  import TagHierarchy from './TagHierarchy.svelte'
  import { Analytics } from '@hcengineering/analytics'
  import { makeRank } from '@hcengineering/rank'
  import { translate } from '@hcengineering/platform'

  export let _class: Ref<Class<Doc>>

  const client = getClient()

  const clazz = client.getHierarchy().getClass(card.class.Card)

  const dispatch = createEventDispatcher()

  let classes: Ref<Class<Doc>>[] = []

  function fillClasses (tags: MasterTag[]): void {
    classes = tags.filter((it) => it.extends === card.class.Card).map((it) => it._id)
  }

  const query = createQuery()
  query.query(card.class.MasterTag, {}, (res) => {
    fillClasses(res)
  })

  async function createCard (): Promise<void> {
    const lastOne = await client.findOne(card.class.Card, {}, { sort: { rank: SortingOrder.Descending } })
    const title = await translate(card.string.Card, {})

    const _id = await client.createDoc(card.class.Card, core.space.Workspace, {
      title,
      rank: makeRank(lastOne?.rank, undefined),
      content: '' as MarkupBlobRef
    })

    Analytics.handleEvent(CardEvents.CardCreated)

    const loc = getCurrentLocation()
    loc.path[3] = _id
    loc.path.length = 4
    navigate(loc)
  }
</script>

<div
  class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal' ? 'portrait' : 'landscape'} border-left"
  class:fly={$deviceInfo.navigator.float}
>
  <div class="antiPanel-wrap__content hulyNavPanel-container">
    <NavHeader label={card.string.Cards} />

    <div class="antiNav-subheader">
      <Button
        id={'new-card'}
        icon={IconAdd}
        label={card.string.CreateCard}
        justify={'left'}
        width={'100%'}
        kind={'primary'}
        gap={'large'}
        on:click={createCard}
      />
    </div>

    <NavLink space={card.class.Card}>
      <NavItem
        _id={card.class.Card}
        label={card.string.CardLibrary}
        isFold
        empty
        selected={card.class.Card === _class}
        on:click={() => {
          dispatch('select', card.class.Card)
        }}
        on:contextmenu={(evt) => {
          showMenu(evt, { object: clazz })
        }}
      />
    </NavLink>

    <div class="antiNav-divider line" />

    <Scroller shrink>
      <TagHierarchy bind:_class {classes} on:select />
    </Scroller>

    <NavFooter split />
  </div>
</div>
