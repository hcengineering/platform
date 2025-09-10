<script lang="ts">
  import { Button, Notification, NotificationToast } from '@hcengineering/ui'
  import love from '../../plugin'
  import { onMount } from 'svelte'
  import { playSound } from '@hcengineering/presentation'
  import { leaveMeeting } from '../../meetingController'

  export let onRemove: () => void
  export let notification: Notification

  function stayInMeeting (_e: MouseEvent): void {
    onRemove()
  }

  async function leave (_e: MouseEvent): Promise<void> {
    await leaveMeeting()
    onRemove()
  }

  onMount(async () => {
    await playSound(love.sound.MeetingEndNotification)
  })
</script>

<NotificationToast title={notification.title} severity={notification.severity} onClose={onRemove}>
  <svelte:fragment slot="content">
    {notification.subTitle}
  </svelte:fragment>
  <svelte:fragment slot="buttons">
    <div style="width: auto" />
    <div class="flex-between gap-2">
      <Button label={love.string.LeaveRoom} stopPropagation={false} kind="negative" on:click={leave} />
      <Button label={love.string.StayInRoom} stopPropagation={false} kind="primary" on:click={stayInMeeting} />
    </div>
  </svelte:fragment>
</NotificationToast>
