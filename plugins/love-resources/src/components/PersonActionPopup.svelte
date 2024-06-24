<script lang="ts">
  import { Person } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { Room, RoomAccess } from '@hcengineering/love'
  import { ActionIcon } from '@hcengineering/ui'
  import love from '../plugin'
  import { invite, tryConnect } from '../utils'
  import { infos, invites, myInfo, myRequests } from '../stores'
  import { personByIdStore } from '@hcengineering/contact-resources'

  export let room: Room
  export let person: Ref<Person>

  $: info = $infos.filter((p) => p.room === room._id)
</script>

<div class="p-3 flex-gap-2 antiPopup">
  {#if $myInfo?.room !== room._id}
    <ActionIcon
      size={'small'}
      label={love.string.Invite}
      icon={love.icon.Invite}
      action={() => {
        invite(person, $myInfo?.room)
      }}
    />
    {#if room.access === RoomAccess.Knock}
      <ActionIcon
        size={'small'}
        label={love.string.KnockAction}
        icon={love.icon.Knock}
        action={() => {
          tryConnect($personByIdStore, $myInfo, room, info, $myRequests, $invites)
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
