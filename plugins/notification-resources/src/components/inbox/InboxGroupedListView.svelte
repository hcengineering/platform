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
  import notification, {
    ActivityNotificationViewlet,
    DisplayInboxNotification,
    DocNotifyContext
  } from '@hcengineering/notification'
  import { Ref, Timestamp } from '@hcengineering/core'
  import { createEventDispatcher } from 'svelte'
  import { ListView } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'

  import { InboxNotificationsClientImpl } from '../../inboxNotificationsClient'
  import DocNotifyContextCard from '../DocNotifyContextCard.svelte'
  import { archiveContextNotifications, notificationsComparator, unarchiveContextNotifications } from '../../utils'
  import { InboxData } from '../../types'

  export let data: InboxData
  export let selectedContext: Ref<DocNotifyContext> | undefined
  export let archived = false

  const dispatch = createEventDispatcher()
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const contextByIdStore = inboxClient.contextById

  let list: ListView
  let listSelection = 0
  let element: HTMLDivElement | undefined
  let prevArchived = false

  let archivingContexts = new Set<Ref<DocNotifyContext>>()
  let archivedContexts = new Map<Ref<DocNotifyContext>, Timestamp>()

  let displayData: [Ref<DocNotifyContext>, DisplayInboxNotification[]][] = []
  let viewlets: ActivityNotificationViewlet[] = []

  void getClient()
    .findAll(notification.class.ActivityNotificationViewlet, {})
    .then((res) => {
      viewlets = res
    })

  $: if (prevArchived !== archived) {
    prevArchived = archived
    archivedContexts.clear()
  }
  $: updateDisplayData(data)

  function updateDisplayData (data: InboxData): void {
    let result: [Ref<DocNotifyContext>, DisplayInboxNotification[]][] = Array.from(data.entries())
    if (archivedContexts.size > 0) {
      result = result.filter(([contextId]) => {
        const context = $contextByIdStore.get(contextId)
        return (
          !archivedContexts.has(contextId) ||
          (context?.lastUpdateTimestamp ?? 0) > (archivedContexts.get(contextId) ?? 0)
        )
      })
    }

    displayData = result.sort(([, notifications1], [, notifications2]) =>
      notificationsComparator(notifications1[0], notifications2[0])
    )
  }

  async function archiveContext (listSelection: number): Promise<void> {
    const contextId = displayData[listSelection]?.[0]
    const context = $contextByIdStore.get(contextId)
    if (contextId === undefined || context === undefined) {
      return
    }

    archivingContexts = archivingContexts.add(contextId)
    try {
      const nextContextId = displayData[listSelection + 1]?.[0] ?? displayData[listSelection - 1]?.[0]
      const nextContext = $contextByIdStore.get(nextContextId)

      if (archived) {
        void unarchiveContextNotifications(context)
      } else {
        void archiveContextNotifications(context)
      }

      list.select(Math.min(listSelection, displayData.length - 2))
      archivedContexts = archivedContexts.set(contextId, context.lastUpdateTimestamp ?? 0)
      displayData = displayData.filter(([id]) => id !== contextId)

      if (selectedContext === contextId || selectedContext === undefined) {
        dispatch('click', { context: nextContext })
      }
    } catch (e) {}

    archivingContexts.delete(contextId)
    archivingContexts = archivingContexts
  }

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

      await archiveContext(listSelection)
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      const contextId = displayData[listSelection]?.[0]
      const context = $contextByIdStore.get(contextId)

      dispatch('click', { context })
    }
  }

  $: if (element != null) {
    element.focus()
  }

  function getContextKey (index: number): string {
    const contextId = displayData[index][0]
    return contextId ?? index.toString()
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="root" bind:this={element} tabindex="0" on:keydown={onKeydown}>
  <ListView
    bind:this={list}
    bind:selection={listSelection}
    count={displayData.length}
    items={displayData}
    highlightIndex={displayData.findIndex(([context]) => context === selectedContext)}
    noScroll
    minHeight="5.625rem"
    kind="full-size"
    colorsSchema="lumia"
    lazy={true}
    getKey={getContextKey}
  >
    <svelte:fragment slot="item" let:item={itemIndex}>
      {@const contextId = displayData[itemIndex][0]}
      {@const contextNotifications = displayData[itemIndex][1]}
      {@const context = $contextByIdStore.get(contextId)}
      {#if context}
        <DocNotifyContextCard
          value={context}
          notifications={contextNotifications}
          {archived}
          {viewlets}
          isArchiving={archivingContexts.has(contextId)}
          on:archive={() => archiveContext(itemIndex)}
          on:click={(event) => {
            dispatch('click', event.detail)
            listSelection = itemIndex
          }}
        />
      {/if}
    </svelte:fragment>
  </ListView>
</div>

<style lang="scss">
  .root {
    &:focus {
      outline: 0;
    }
    :global(.list-item) {
      border-radius: 0;
    }
  }
</style>
