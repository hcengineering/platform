<script lang="ts">
  import type { Card } from '@anticrm/board'
  import { Button } from '@anticrm/ui'
  import { NotificationClientImpl } from '@anticrm/notification-resources'
  import board from '../plugin'

  export let object: Card

  const notificationClient = NotificationClientImpl.getClient()
  const lastViews = notificationClient.getLastViews()
  $: lastView = $lastViews.get(object._id)
  $: subscribed = lastView !== undefined && lastView !== -1
</script>

{#if subscribed}
  <Button
    icon={board.icon.Card}
    label={board.string.Unwatch}
    kind={'no-border'}
    justify="left"
    on:click={() => {
      notificationClient.unsubscribe(object._id)
    }}
  />
{:else}
  <Button
    icon={board.icon.Card}
    label={board.string.Watch}
    kind={'no-border'}
    justify="left"
    on:click={() => {
      notificationClient.updateLastView(object._id, object._class, undefined, true)
    }}
  />
{/if}
