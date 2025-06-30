<script lang="ts">
  import { Button, Notification, NotificationToast } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  export let onRemove: () => void
  export let notification: Notification
</script>

<NotificationToast title={notification.title} severity={notification.severity} onClose={onRemove}>
  <svelte:fragment slot="content">
    {notification.subTitle}
  </svelte:fragment>
  <svelte:fragment slot="buttons">
    <div style="width: auto" />
    <a href="https://huly.io/signup" target="_blank">
      <Button label={view.string.ReadOnlySignUp} stopPropagation={false} />
    </a>
  </svelte:fragment>
</NotificationToast>
