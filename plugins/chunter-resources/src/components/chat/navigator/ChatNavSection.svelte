<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import contact from '@hcengineering/contact'
  import { statusByUserStore } from '@hcengineering/contact-resources'
  import { Doc, reduceCalls, Ref } from '@hcengineering/core'
  import { DocNotifyContext } from '@hcengineering/notification'
  import { getResource, IntlString, translate } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import ui, { Action, AnySvelteComponent, IconSize, ModernButton, NavGroup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { getDocTitle } from '@hcengineering/view-resources'

  import { createEventDispatcher } from 'svelte'
  import chunter from '../../../plugin'
  import { getChannelName, getObjectIcon } from '../../../utils'
  import { ChatNavItemModel, SortFnOptions } from '../types'
  import ChatNavItem from './ChatNavItem.svelte'

  export let id: string
  export let header: IntlString
  export let objects: Doc[]
  export let itemsCount: number
  export let contexts: DocNotifyContext[]
  export let actions: Action[] = []
  export let objectId: Ref<Doc> | undefined
  export let sortFn: (items: ChatNavItemModel[], options: SortFnOptions) => ChatNavItemModel[]

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let sortedItems: ChatNavItemModel[] = []
  let items: ChatNavItemModel[] = []

  const dispatcher = createEventDispatcher()

  let canShowMore = false

  $: void getChatNavItems(objects, (res) => {
    items = res
  })

  $: sortedItems = sortFn(items, {
    contexts,
    userStatusByAccount: $statusByUserStore
  })
  $: canShowMore = itemsCount > items.length

  const getChatNavItems = reduceCalls(
    async (objects: Doc[], handler: (items: ChatNavItemModel[]) => void): Promise<void> => {
      const items: ChatNavItemModel[] = []

      for (const object of objects) {
        const { _class } = object
        const iconMixin = hierarchy.classHierarchyMixin(_class, view.mixin.ObjectIcon)
        const titleIntl = client.getHierarchy().getClass(_class).label

        const isPerson = hierarchy.isDerived(_class, contact.class.Person)
        const isDocChat = !hierarchy.isDerived(_class, chunter.class.ChunterSpace)
        const isDirect = hierarchy.isDerived(_class, chunter.class.DirectMessage)

        const iconSize: IconSize = isDirect || isPerson ? 'x-small' : 'small'

        let icon: AnySvelteComponent | undefined = undefined

        if (iconMixin?.component) {
          icon = await getResource(iconMixin.component)
        }

        const hasId = hierarchy.classHierarchyMixin(object._class, view.mixin.ObjectIdentifier) !== undefined
        const showDescription = hasId && isDocChat && !isPerson

        items.push({
          id: object._id,
          object,
          title: (await getChannelName(object._id, object._class, object)) ?? (await translate(titleIntl, {})),
          description: showDescription ? await getDocTitle(client, object._id, object._class, object) : undefined,
          icon: icon ?? getObjectIcon(_class),
          iconProps: { showStatus: true },
          iconSize,
          withIconBackground: !isDirect && !isPerson
        })
      }

      handler(items)
    }
  )

  function onShowMore (): void {
    dispatcher('show-more')
  }

  $: visibleItem = sortedItems.find(({ id }) => id === objectId)
</script>

{#if sortedItems.length > 0 && contexts.length > 0}
  <NavGroup
    _id={id}
    label={header}
    categoryName={id}
    {actions}
    highlighted={items.some((it) => it.id === objectId)}
    isFold
    empty={sortedItems.length === 0}
    visible={visibleItem !== undefined}
    noDivider
  >
    {#each sortedItems as item (item.id)}
      {@const context = contexts.find(({ objectId }) => objectId === item.id)}
      <ChatNavItem {context} isSelected={objectId === item.id} {item} type={'type-object'} on:select />
    {/each}
    {#if canShowMore}
      <div class="showMore">
        <ModernButton label={ui.string.ShowMore} kind="tertiary" inheritFont size="extra-small" on:click={onShowMore} />
      </div>
    {/if}
    <svelte:fragment slot="visible" let:isOpen>
      {#if visibleItem !== undefined && !isOpen}
        {@const context = contexts.find(({ objectId }) => objectId === visibleItem?.id)}
        <ChatNavItem {context} isSelected item={visibleItem} type={'type-object'} on:select />
      {/if}
    </svelte:fragment>
  </NavGroup>
{/if}

<style lang="scss">
  .showMore {
    margin: var(--spacing-1);
    font-size: 0.75rem;
  }
</style>
