<script lang="ts">
  import { onDestroy } from 'svelte'

  import { Notification } from './Notification'
  import Component from '../Component.svelte'
  import store from './store'

  export let notification: Notification

  const { id, closeTimeout } = notification

  const removeNotificationHandler = () => store.removeNotification(id)

  let timeout: any | null = null

  if (closeTimeout) {
    timeout = setTimeout(removeNotificationHandler, closeTimeout)
  }

  onDestroy(() => {
    if (closeTimeout && timeout) {
      clearTimeout(timeout)
    }
  })
</script>

{#if typeof notification.component === 'string'}
  <Component is={notification.component} props={{ notification, onRemove: removeNotificationHandler }} />
{:else}
  <svelte:component this={notification.component} {notification} onRemove={removeNotificationHandler} />
{/if}
