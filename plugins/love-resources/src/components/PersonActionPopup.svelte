<script lang="ts">
  import { Person } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { isOffice, Room, RoomAccess } from '@hcengineering/love'
  import { ActionIcon } from '@hcengineering/ui'
  import love from '../plugin'
  import { myInfo } from '../stores'
  import { joinMeeting, kick, sendInvite } from '../meetingController'

  export let room: Room
  export let person: Ref<Person>

  $: isMyOffice = isOffice(room) && room.person === $myInfo?.person
</script>

<div class="p-3 flex-gap-2 antiPopup">
  {#if isMyOffice && person !== $myInfo?.person}
    <ActionIcon
      size={'small'}
      label={love.string.Kick}
      icon={love.icon.Kick}
      action={() => {
        kick(person)
      }}
    />
  {/if}
  {#if $myInfo?.room !== room._id}
    <ActionIcon
      size={'small'}
      label={love.string.Invite}
      icon={love.icon.Invite}
      action={() => {
        sendInvite(person)
      }}
    />
    {#if room.access === RoomAccess.Knock}
      <ActionIcon
        size={'small'}
        label={love.string.KnockAction}
        icon={love.icon.Knock}
        action={() => {
          joinMeeting(room)
        }}
      />
    {/if}
  {/if}
</div>

<style lang="scss">
  .antiPopup {
    flex-direction: row;
    margin-top: -0.75rem;
  }
</style>
