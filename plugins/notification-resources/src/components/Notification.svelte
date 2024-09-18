<script lang="ts">
  import { PersonAccount } from '@hcengineering/contact'
  import { Avatar, personAccountByIdStore, personByIdStore } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { BrowserNotification } from '@hcengineering/notification'
  import { Button, navigate, Notification as PlatformNotification, NotificationToast } from '@hcengineering/ui'
  import view, { decodeObjectURI } from '@hcengineering/view'
  import chunter from '@hcengineering/chunter'
  import { getResource } from '@hcengineering/platform'
  import { ActivityMessage } from '@hcengineering/activity'

  import { pushAvailable, subscribePush } from '../utils'
  import plugin from '../plugin'

  export let notification: PlatformNotification
  export let onRemove: () => void

  $: value = notification.params?.value as BrowserNotification

  $: senderAccount =
    value.senderId !== undefined ? $personAccountByIdStore.get(value.senderId as Ref<PersonAccount>) : undefined
  $: sender = senderAccount !== undefined ? $personByIdStore.get(senderAccount.person) : undefined

  async function openChannelInSidebar (): Promise<void> {
    if (!value.onClickLocation) return
    const { onClickLocation } = value
    const [_id, _class] = decodeObjectURI(onClickLocation.path[3] ?? '')

    onRemove()

    if (!_id || !_class || _id === '' || _class === '') {
      navigate(onClickLocation)
      return
    }

    const thread = onClickLocation.path[4] as Ref<ActivityMessage> | undefined
    const fn = await getResource(chunter.function.OpenChannelInSidebar)
    await fn(_id, _class, undefined, thread)
  }
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
          openChannelInSidebar()
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
