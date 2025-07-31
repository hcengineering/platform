<script lang="ts">
  import { Button, navigate, Notification, NotificationToast } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { getCurrentWorkspaceUrl } from '@hcengineering/presentation'
  import { allowGuestSignUpStore } from '../utils'

  export let onRemove: () => void
  export let notification: Notification

  function joinWorkspace (e: MouseEvent): void {
    navigate({ path: ['login', 'join'], query: { workspace: getCurrentWorkspaceUrl() } })
  }
</script>

<NotificationToast title={notification.title} severity={notification.severity} onClose={onRemove}>
  <svelte:fragment slot="content">
    {notification.subTitle}
  </svelte:fragment>
  <svelte:fragment slot="buttons">
    <div style="width: auto" />
    <div class="flex-between gap-2">
      {#if $allowGuestSignUpStore}
        <Button label={view.string.ReadOnlyJoinWorkspace} stopPropagation={false} on:click={joinWorkspace} />
      {/if}
      <a href="https://huly.io/signup" target="_blank">
        <Button label={view.string.ReadOnlySignUp} stopPropagation={false} kind="primary" />
      </a>
    </div>
  </svelte:fragment>
</NotificationToast>
