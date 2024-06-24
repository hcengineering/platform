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
  import { Doc, Ref } from '@hcengineering/core'
  import { DocNotifyContext } from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import ui, { Action, AnySvelteComponent, IconSize, ModernButton, NavGroup } from '@hcengineering/ui'
  import { getDocTitle } from '@hcengineering/view-resources'
  import contact from '@hcengineering/contact'
  import { getResource, IntlString, translate } from '@hcengineering/platform'
  import view from '@hcengineering/view'
  import { personAccountByIdStore, statusByUserStore } from '@hcengineering/contact-resources'

  import ChatNavItem from './ChatNavItem.svelte'
  import chunter from '../../../plugin'
  import { ChatNavItemModel, SortFnOptions } from '../types'
  import { getObjectIcon, getChannelName } from '../../../utils'

  export let id: string
  export let header: IntlString
  export let objects: Doc[]
  export let contexts: DocNotifyContext[]
  export let actions: Action[] = []
  export let maxItems: number | undefined = undefined
  export let objectId: Ref<Doc> | undefined
  export let sortFn: (items: ChatNavItemModel[], options: SortFnOptions) => ChatNavItemModel[]

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let sortedItems: ChatNavItemModel[] = []
  let items: ChatNavItemModel[] = []
  let visibleItems: ChatNavItemModel[] = []

  let canShowMore = false
  let isShownMore = false

  $: void getChatNavItems(objects).then((res) => {
    items = res
  })

  $: sortedItems = sortFn(items, {
    contexts,
    userStatusByAccount: $statusByUserStore,
    personAccountById: $personAccountByIdStore
  })
  $: canShowMore = !!maxItems && items.length > maxItems

  $: visibleItems = getVisibleItems(canShowMore, isShownMore, maxItems, sortedItems, objectId)

  async function getChatNavItems (objects: Doc[]): Promise<ChatNavItemModel[]> {
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
        withIconBackground: !isDirect && !isPerson,
        isSecondary: isDocChat && !isPerson
      })
    }

    return items
  }

  function onShowMore (): void {
    isShownMore = !isShownMore
  }

  function getVisibleItems (
    canShowMore: boolean,
    isShownMore: boolean,
    maxItems: number | undefined,
    items: ChatNavItemModel[],
    selectedObjectId: Ref<Doc> | undefined
  ): ChatNavItemModel[] {
    if (!canShowMore || isShownMore) {
      return items
    }

    const result = items.slice(0, maxItems)

    if (selectedObjectId === undefined) {
      return result
    }

    const exists = result.some(({ id }) => id === selectedObjectId)

    if (exists) {
      return result
    }

    const selectedItem = items.find(({ id }) => id === selectedObjectId)

    if (selectedItem === undefined) {
      return result
    }

    result.push(selectedItem)

    return result
  }
  $: visibleItem = visibleItems.find(({ id }) => id === objectId)
</script>

{#if visibleItems.length > 0 && contexts.length > 0}
  <NavGroup
    _id={id}
    label={header}
    categoryName={id}
    {actions}
    highlighted={items.some((it) => it.id === objectId)}
    isFold
    empty={visibleItems.length === 0}
    visible={visibleItem !== undefined}
    noDivider
  >
    {#each visibleItems as item (item.id)}
      {@const context = contexts.find(({ attachedTo }) => attachedTo === item.id)}
      <ChatNavItem {context} isSelected={objectId === item.id} {item} type={'type-object'} on:select />
    {/each}
    {#if canShowMore}
      <div class="showMore">
        <ModernButton
          label={isShownMore ? ui.string.ShowLess : ui.string.ShowMore}
          kind="tertiary"
          inheritFont
          size="extra-small"
          on:click={onShowMore}
        />
      </div>
    {/if}
    <svelte:fragment slot="visible" let:isOpen>
      {#if visibleItem !== undefined && !isOpen}
        {@const context = contexts.find(({ attachedTo }) => attachedTo === visibleItem?.id)}
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
