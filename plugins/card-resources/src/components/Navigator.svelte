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
  import { CardEvents, MasterTag } from '@hcengineering/card'
  import core, { Class, Doc, MarkupBlobRef, Ref, SortingOrder } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { makeRank } from '@hcengineering/rank'
  import {
    Button,
    ButtonWithDropdown,
    IconAdd,
    IconDropdown,
    NavItem,
    Scroller,
    SelectPopupValueType,
    deviceOptionsStore as deviceInfo,
    getCurrentLocation,
    navigate,
    showPopup
  } from '@hcengineering/ui'
  import { NavLink, showMenu } from '@hcengineering/view-resources'
  import { NavFooter, NavHeader } from '@hcengineering/workbench-resources'
  import { createEventDispatcher } from 'svelte'
  import card from '../plugin'
  import CreateTag from './CreateTag.svelte'
  import TagHierarchy from './TagHierarchy.svelte'

  export let _class: Ref<Class<Doc>>

  const client = getClient()

  const clazz = client.getHierarchy().getClass(card.class.Card)

  const dispatch = createEventDispatcher()

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

  function createMasteTag (): void {
    showPopup(CreateTag, {
      parent: undefined,
      _class: card.class.MasterTag
    })
  }

  async function dropdownItemSelected (res?: SelectPopupValueType['id']): Promise<void> {
    if (res === card.string.CreateCard) {
      await createCard()
    } else if (res === card.string.CreateMasterTag) {
      createMasteTag()
    }
  }

  const dropdownItems = [
    { id: card.string.CreateCard, label: card.string.CreateCard },
    { id: card.string.CreateMasterTag, label: card.string.CreateMasterTag }
  ]
</script>

<div
  class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal' ? 'portrait' : 'landscape'} border-left"
  class:fly={$deviceInfo.navigator.float}
>
  <div class="antiPanel-wrap__content hulyNavPanel-container">
    <NavHeader label={card.string.Cards} />

    <div class="antiNav-subheader">
      {#if allClasses.length > 0}
        <ButtonWithDropdown
          icon={IconAdd}
          justify={'left'}
          kind={'primary'}
          label={card.string.CreateCard}
          on:click={createCard}
          mainButtonId={'new-card'}
          dropdownIcon={IconDropdown}
          {dropdownItems}
          on:dropdown-selected={(ev) => {
            void dropdownItemSelected(ev.detail)
          }}
        />
      {:else}
        <Button
          icon={IconAdd}
          label={card.string.CreateMasterTag}
          justify={'left'}
          width={'100%'}
          kind={'primary'}
          gap={'large'}
          on:click={createMasteTag}
        />
      {/if}
    </div>

    <NavLink space={card.class.Card}>
      <NavItem
        _id={card.class.Card}
        label={card.string.CardLibrary}
        icon={card.icon.Card}
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
      <TagHierarchy bind:_class {classes} {allClasses} on:select />
    </Scroller>

    <NavFooter split />
  </div>
</div>
