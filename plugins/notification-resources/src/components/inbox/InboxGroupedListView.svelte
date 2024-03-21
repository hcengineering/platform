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
  import { Ref } from '@hcengineering/core'
  import { createEventDispatcher } from 'svelte'
  import { ListView } from '@hcengineering/ui'

  import { InboxNotificationsClientImpl } from '../../inboxNotificationsClient'
  import DocNotifyContextCard from '../DocNotifyContextCard.svelte'
  import { deleteContextNotifications } from '../../utils'
  import { getClient } from '@hcengineering/presentation'

  export let notifications: DisplayInboxNotification[] = []

  // const client = getClient()
  // const dispatch = createEventDispatcher()
  // const inboxClient = InboxNotificationsClientImpl.getClient()
  // const contextByIdStore = inboxClient.contextById
  //
  // let list: ListView
  // let listSelection = 0
  // let element: HTMLDivElement | undefined
  //
  // let displayData: [Ref<DocNotifyContext>, DisplayInboxNotification[]][] = []
  // let viewlets: ActivityNotificationViewlet[] = []
  //
  // void client.findAll(notification.class.ActivityNotificationViewlet, {}).then((res) => {
  //   viewlets = res
  // })
  //
  // $: updateDisplayData(notifications)
  //
  // function updateDisplayData (notifications: DisplayInboxNotification[]) {
  //   const result: [Ref<DocNotifyContext>, DisplayInboxNotification[]][] = []
  //
  //   notifications.forEach((item) => {
  //     const data = result.find(([_id]) => _id === item.docNotifyContext)
  //
  //     if (!data) {
  //       result.push([item.docNotifyContext, [item]])
  //     } else {
  //       data[1].push(item)
  //     }
  //   })
  //
  //   displayData = result
  // }
  //
  // async function handleCheck (context: DocNotifyContext, isChecked: boolean) {
  //   if (!isChecked) {
  //     return
  //   }
  //
  //   await deleteContextNotifications(context)
  // }
  //
  // function onKeydown (key: KeyboardEvent): void {
  //   if (key.code === 'ArrowUp') {
  //     key.stopPropagation()
  //     key.preventDefault()
  //     list.select(listSelection - 1)
  //   }
  //   if (key.code === 'ArrowDown') {
  //     key.stopPropagation()
  //     key.preventDefault()
  //     list.select(listSelection + 1)
  //   }
  //   if (key.code === 'Backspace') {
  //     key.preventDefault()
  //     key.stopPropagation()
  //
  //     const context = $contextByIdStore.find(({ _id }) => _id === displayData[listSelection]?.[0])
  //
  //     void deleteContextNotifications(context)
  //   }
  //   if (key.code === 'Enter') {
  //     key.preventDefault()
  //     key.stopPropagation()
  //     const context = $contextByIdStore.find(({ _id }) => _id === displayData[listSelection]?.[0])
  //     dispatch('click', { context })
  //   }
  // }
  //
  // $: if (element) {
  //   element.focus()
  // }
  //
  // function getContextKey (index: number): string {
  //   const contextId = displayData[index][0]
  //
  //   if (contextId === undefined) {
  //     return index.toString()
  //   }
  //
  //   return contextId
  // }
</script>

<!--&lt;!&ndash; svelte-ignore a11y-no-noninteractive-tabindex &ndash;&gt;-->
<!--&lt;!&ndash; svelte-ignore a11y-no-static-element-interactions &ndash;&gt;-->
<!--<div class="root" bind:this={element} tabindex="0" on:keydown={onKeydown}>-->
<!--  <ListView-->
<!--    bind:this={list}-->
<!--    bind:selection={listSelection}-->
<!--    count={displayData.length}-->
<!--    noScroll-->
<!--    colorsSchema="lumia"-->
<!--    lazy={true}-->
<!--    getKey={getContextKey}-->
<!--  >-->
<!--    <svelte:fragment slot="item" let:item={itemIndex}>-->
<!--      {@const contextId = displayData[itemIndex][0]}-->
<!--      {@const contextNotifications = displayData[itemIndex][1]}-->
<!--      {@const context = $contextByIdStore.find(({ _id }) => _id === contextId)}-->
<!--      {#if context}-->
<!--        <DocNotifyContextCard-->
<!--          value={context}-->
<!--          visibleNotification={contextNotifications[0]}-->
<!--          isCompact={contextNotifications.length === 1}-->
<!--          unreadCount={contextNotifications.filter(({ isViewed }) => !isViewed).length}-->
<!--          {viewlets}-->
<!--          on:click={(event) => {-->
<!--            dispatch('click', event.detail)-->
<!--            listSelection = itemIndex-->
<!--          }}-->
<!--          on:check={(event) => handleCheck(context, event.detail)}-->
<!--        />-->
<!--        <div class="separator" />-->
<!--      {/if}-->
<!--    </svelte:fragment>-->
<!--  </ListView>-->
<!--</div>-->

<style lang="scss">
  .root {
    &:focus {
      outline: 0;
    }
  }

  .separator {
    width: 100%;
    height: 1px;
    background-color: var(--theme-navpanel-border);
  }
</style>
