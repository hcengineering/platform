<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { Label, ListView, Loading, Scroller } from '@hcengineering/ui'
  import { Doc, Ref } from '@hcengineering/core'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import notification, { ActivityNotificationViewlet } from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'

  import inbox from '../plugin'
  import { NavigationItem } from '../type'
  import { NavigationClient } from '../client'
  import InboxCard from './InboxCard.svelte'

  export let doc: Doc | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()

  const navClient: NavigationClient = new NavigationClient(InboxNotificationsClientImpl.getClient())
  const navigationItemsStore = navClient.navigationItemsStore
  const isLoadingStore = navClient.isLoadingStore

  onDestroy(() => {
    navClient.destroy()
  })

  let navItems: NavigationItem[] = []

  $: navItems = $navigationItemsStore

  let divScroll: HTMLElement | undefined | null = undefined
  let contentDiv: HTMLElement | undefined | null = undefined

  let list: ListView
  let listSelection = 0

  let viewlets: ActivityNotificationViewlet[] = []

  void client.findAll(notification.class.ActivityNotificationViewlet, {}).then((res) => {
    viewlets = res
  })

  function handleScroll (): void {
    if (divScroll != null && navClient.hasPrevPage()) {
      const isAtBottom = divScroll.scrollTop + divScroll.clientHeight >= divScroll.scrollHeight - 10
      if (isAtBottom) {
        navClient.prev()
      }
    }
  }

  const docById = new Map<Ref<Doc>, Doc>()

  async function onKeydown (key: KeyboardEvent): Promise<void> {
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(listSelection - 1)
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(listSelection + 1)
    }
    if (key.code === 'Backspace') {
      key.preventDefault()
      key.stopPropagation()
      const navItem = navItems[listSelection]
      if (navItem != null) {
        await navClient.remove(navItem)
      }
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      const navItem = navItems[listSelection]
      const doc = docById.get(navItem?._id)
      if (navItem != null && doc != null) {
        dispatch('select', {
          ...navItem,
          doc
        })
      }
    }
  }

  $: if (contentDiv != null) {
    contentDiv.focus()
  }

  function getContextKey (index: number): string {
    const item = navItems[index]
    if (item == null) return index.toString()

    return `${item._id}-${item.type}`
  }
</script>

{#if navItems.length > 0}
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <Scroller bind:divScroll padding="0" shrink onScroll={handleScroll}>
    <div class="inbox-list" bind:this={contentDiv} tabindex="0" on:keydown={onKeydown}>
      <ListView
        bind:this={list}
        bind:selection={listSelection}
        count={navItems.length}
        items={navItems}
        highlightIndex={navItems.findIndex((it) => it._id === doc?._id)}
        noScroll
        kind="full-size"
        colorsSchema="lumia"
        lazy={true}
        getKey={getContextKey}
      >
        <svelte:fragment slot="item" let:item={itemIndex}>
          {@const navItem = navItems[itemIndex]}
          {#if navItem}
            <InboxCard
              {navClient}
              {navItem}
              {viewlets}
              selected={navItem._id === doc?._id}
              on:doc={(e) => {
                const d = e.detail
                if (d == null) return
                docById.set(d._id, e.detail)
              }}
              on:select={(e) => {
                dispatch('select', { ...navItem, doc: e.detail })
                listSelection = itemIndex
              }}
            />
          {/if}
        </svelte:fragment>
      </ListView>
    </div>
  </Scroller>
{:else if $isLoadingStore}
  <div class="placeholder">
    <Loading />
  </div>
{:else}
  <div class="placeholder">
    <div class="placeholder__header">
      <Label label={inbox.string.InboxIsClear} />
    </div>
    <span class="mb-4">
      <Label label={inbox.string.YouDontHaveAnyNewMessages} />
    </span>
  </div>
{/if}

<style lang="scss">
  .inbox-list {
    display: flex;
    flex-direction: column;
    width: 100%;

    &:focus {
      outline: 0;
    }

    :global(.list-item) {
      border-radius: 0;
    }
  }

  .placeholder {
    display: flex;
    align-self: center;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    height: inherit;
    width: 100%;
    gap: 0.5rem;

    &__header {
      font-weight: 600;
    }
  }
</style>
