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
  import { Card, CardEvents } from '@hcengineering/card'
  import core, { Data, Doc, fillDefaults, MarkupBlobRef, SortingOrder, WithLookup } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    Label,
    Scroller,
    Button,
    getCurrentLocation,
    IconAdd,
    navigate,
    resizeObserver,
    Section
  } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import {
    List,
    ListSelectionProvider,
    restrictionStore,
    SelectDirection,
    ViewletsSettingButton
  } from '@hcengineering/view-resources'
  import card from '../plugin'
  import { Analytics } from '@hcengineering/analytics'
  import { translate } from '@hcengineering/platform'
  import { makeRank } from '@hcengineering/rank'

  export let object: Card
  export let readonly: boolean = false

  let viewlet: WithLookup<Viewlet> | undefined
  let viewOptions: ViewOptions | undefined
  let preference: ViewletPreference | undefined = undefined

  const query = createQuery()

  const viewletId = card.viewlet.CardList

  let list: List
  const listProvider = new ListSelectionProvider(
    (offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection, noScroll?: boolean) => {
      if (dir === 'vertical') {
        // Select next
        list?.select(offset, of, noScroll)
      }
    }
  )

  let docs: Doc[] = []

  $: query.query(
    view.class.Viewlet,
    {
      _id: viewletId
    },
    (res) => {
      viewlet = res[0]
    },
    {
      lookup: {
        descriptor: view.class.ViewletDescriptor
      }
    }
  )

  const preferenceQuery = createQuery()

  $: if (viewlet != null) {
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        space: core.space.Workspace,
        attachedTo: viewletId
      },
      (res) => {
        preference = res[0]
      },
      { limit: 1 }
    )
  } else {
    preferenceQuery.unsubscribe()
    preference = undefined
  }

  $: selectedConfig = preference?.config ?? viewlet?.config ?? []
  $: config = selectedConfig?.filter((p) =>
    typeof p === 'string'
      ? !p.includes('$lookup') && !p.startsWith('@')
      : !p.key.includes('$lookup') && !p.key.startsWith('@')
  )

  let listWidth: number

  async function createCard (): Promise<void> {
    const client = getClient()
    const hierarchy = client.getHierarchy()
    const lastOne = await client.findOne(card.class.Card, {}, { sort: { rank: SortingOrder.Descending } })
    const title = await translate(card.string.Card, {})

    const data: Data<Card> = {
      parent: object._id,
      title,
      rank: makeRank(lastOne?.rank, undefined),
      content: '' as MarkupBlobRef,
      blobs: {},
      parentInfo: [
        ...(object.parentInfo ?? []),
        {
          _id: object._id,
          _class: object._class,
          title: object.title
        }
      ]
    }

    const filledData = fillDefaults(hierarchy, data, object._class)

    const _id = await client.createDoc(object._class, core.space.Workspace, filledData)

    Analytics.handleEvent(CardEvents.CardCreated)

    const loc = getCurrentLocation()
    loc.path[3] = _id
    loc.path.length = 4
    navigate(loc)
  }

  const selection = listProvider.selection
</script>

<Section label={card.string.Children} icon={card.icon.Card}>
  <svelte:fragment slot="header">
    <ViewletsSettingButton bind:viewOptions viewletQuery={{ _id: viewletId }} kind={'tertiary'} bind:viewlet />
    {#if !$restrictionStore.readonly && !readonly}
      <Button
        id="add-child-card"
        icon={IconAdd}
        label={card.string.CreateChild}
        kind={'ghost'}
        showTooltip={{ label: card.string.CreateChild, direction: 'bottom' }}
        on:click={() => {
          void createCard()
        }}
      />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="content">
    {#if (object?.children ?? 0) > 0 && viewOptions !== undefined && viewlet}
      <Scroller horizontal>
        <div
          class="list"
          use:resizeObserver={(evt) => {
            listWidth = evt.clientWidth
          }}
        >
          <List
            bind:this={list}
            {listProvider}
            _class={card.class.Card}
            query={{
              parent: object._id
            }}
            selectedObjectIds={$selection ?? []}
            configurations={undefined}
            {config}
            {viewOptions}
            compactMode={listWidth <= 600}
            on:docs
            on:row-focus={(event) => {
              listProvider.updateFocus(event.detail ?? undefined)
            }}
            on:check={(event) => {
              listProvider.updateSelection(event.detail.docs, event.detail.value)
            }}
            on:content={(evt) => {
              docs = evt.detail
              listProvider.update(evt.detail)
            }}
          />
        </div>
      </Scroller>
    {:else if !readonly}
      <div class="antiSection-empty solid clear-mins mt-3">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span class="over-underline content-color" on:click={createCard}>
          <Label label={card.string.CreateChild} />
        </span>
      </div>
    {/if}
  </svelte:fragment>
</Section>
