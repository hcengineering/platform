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
    {#if $allowGuestSignUpStore}
      <Button
        label={view.string.ReadOnlyJoinWorkspace}
        labelParams={{ icon: ' 👥' }}
        stopPropagation={false}
        on:click={joinWorkspace}
      />
    {:else}
      <div style="width: auto" />
    {/if}
    <a href="https://huly.io/signup" target="_blank">
      <Button label={view.string.ReadOnlySignUp} labelParams={{ icon: ' 🚀' }} stopPropagation={false} />
    </a>
  </svelte:fragment>
</NotificationToast>
