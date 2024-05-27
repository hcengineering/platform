<script lang="ts">
  import { PersonAccount } from '@hcengineering/contact'
  import { Avatar, personAccountByIdStore, personByIdStore } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { BrowserNotification } from '@hcengineering/notification'
  import { Button, Notification as PlatformNotification, NotificationToast, navigate } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { pushAvailable, subscribePush } from '../utils'
  import plugin from '../plugin'

  export let notification: PlatformNotification
  export let onRemove: () => void

  $: value = notification.params?.value as BrowserNotification

  $: senderAccount =
    value.senderId !== undefined ? $personAccountByIdStore.get(value.senderId as Ref<PersonAccount>) : undefined
  $: sender = senderAccount !== undefined ? $personByIdStore.get(senderAccount.person) : undefined
</script>

<NotificationToast title={notification.title} severity={notification.severity} onClose={onRemove}>
  <svelte:fragment slot="content">
    <div class="flex-row-center flex-wrap gap-2">
      {#if sender}
        <Avatar person={sender} name={sender.name} size={'small'} />
      {/if}
      <span class="overflow-label">
        {value.body}
      </span>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="buttons">
    {#if value.onClickLocation}
      <Button
        label={view.string.Open}
        on:click={() => {
          if (value.onClickLocation) {
            onRemove()
            navigate(value.onClickLocation)
          }
        }}
      />
    {/if}
    <Button
      label={plugin.string.EnablePush}
      disabled={!pushAvailable()}
      showTooltip={!pushAvailable() ? { label: plugin.string.NotificationBlockedInBrowser } : undefined}
      on:click={subscribePush}
    />
  </svelte:fragment>
</NotificationToast>
