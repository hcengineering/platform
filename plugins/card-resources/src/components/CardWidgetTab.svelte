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
  import { Action, Menu, ModernTab, showPopup } from '@hcengineering/ui'
  import { Widget, WidgetTab } from '@hcengineering/workbench'
  import { createNotificationsQuery, createQuery, getClient, IconWithEmoji } from '@hcengineering/presentation'
  import { Card, MasterTag } from '@hcengineering/card'
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { closeWidgetTab } from '@hcengineering/workbench-resources'
  import view from '@hcengineering/view'
  import { NotificationType } from '@hcengineering/communication-types'

  import cardPlugin from '../plugin'

  export let tab: WidgetTab
  export let widget: Widget
  export let selected = false
  export let actions: Action[] = []

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const cardQuery = createQuery()
  const notificationsQuery = createNotificationsQuery()

  let card: Card | undefined
  let cardId: Ref<Card> = tab.id as Ref<Card>
  $: cardId = tab.id as Ref<Card>

  let count: number = 0

  $: cardQuery.query(cardPlugin.class.Card, { _id: cardId }, (res) => {
    card = res[0]
    if (res.length === 0) {
      void closeWidgetTab(widget, tab.id)
    }
  })

  $: notificationsQuery.query(
    { card: cardId, limit: 1, read: false, order: SortingOrder.Descending, type: NotificationType.Message },
    (res) => {
      count = res.getResult().length
    }
  )

  function handleMenu (event: CustomEvent<MouseEvent>): void {
    if (actions.length === 0) {
      return
    }
    event.preventDefault()
    event.stopPropagation()

    showPopup(Menu, { actions }, event.detail.target as HTMLElement)
  }

  $: clazz = card ? (hierarchy.getClass(card._class) as MasterTag) : undefined
</script>

<ModernTab
  label={card?.title ?? tab.name}
  labelIntl={widget.label}
  highlighted={selected}
  orientation="vertical"
  kind={tab.isPinned ? 'secondary' : 'primary'}
  icon={clazz?.icon === view.ids.IconWithEmoji ? IconWithEmoji : clazz?.icon ?? cardPlugin.icon.Card}
  iconProps={clazz?.icon === view.ids.IconWithEmoji ? { icon: clazz.color, size: 'small' } : {}}
  canClose={!tab.isPinned}
  maxSize="13.5rem"
  on:close
  on:click
  on:contextmenu={handleMenu}
>
  <svelte:fragment slot="prefix">
    {#if count > 0}
      <div class="notifyMarker" />
    {/if}
  </svelte:fragment>
</ModernTab>

<style lang="scss">
  .notifyMarker {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 50%;
    background-color: var(--global-higlight-Color);
    width: 0.5rem;
    height: 0.5rem;
  }
</style>
