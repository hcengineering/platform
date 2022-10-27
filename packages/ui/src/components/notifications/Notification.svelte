<script lang="ts">
  import { onDestroy } from 'svelte'

  import { Notification } from './Notification'
  import { getNotificationsContext } from './store'

  export let notification: Notification

  const { removeNotification } = getNotificationsContext()
  const { id, closeTimeout } = notification

  const removeNotificationHandler = () => removeNotification(id)

  let timeout: number | null = null

  if (closeTimeout) {
    timeout = setTimeout(removeNotificationHandler, closeTimeout)
  }

  onDestroy(() => {
    if (closeTimeout && timeout) {
      clearTimeout(timeout)
    }
  })
</script>

<svelte:component this={notification.component} {notification} onRemove={removeNotificationHandler} />
