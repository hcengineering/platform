<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import { RadioGroup, RadioItem } from '@hcengineering/ui'
  import { Room, RoomAccess, isOffice, roomAccessLabel } from '@hcengineering/love'
  import { createEventDispatcher } from 'svelte'

  export let room: Room

  const dispatch = createEventDispatcher()

  async function setAccess (access: RoomAccess): Promise<void> {
    await getClient().update(room, { access })
    dispatch('close', access)
  }

  const items: RadioItem[] = isOffice(room)
    ? [
        {
          value: RoomAccess.Knock,
          labelIntl: roomAccessLabel[RoomAccess.Knock],
          action: async () => {
            await setAccess(RoomAccess.Knock)
          }
        },
        {
          value: RoomAccess.DND,
          labelIntl: roomAccessLabel[RoomAccess.DND],
          action: async () => {
            await setAccess(RoomAccess.DND)
          }
        }
      ]
    : [
        {
          value: RoomAccess.Open,
          labelIntl: roomAccessLabel[RoomAccess.Open],
          action: async () => {
            await setAccess(RoomAccess.Open)
          }
        },
        {
          value: RoomAccess.Knock,
          labelIntl: roomAccessLabel[RoomAccess.Knock],
          action: async () => {
            await setAccess(RoomAccess.Knock)
          }
        },
        {
          value: RoomAccess.DND,
          labelIntl: roomAccessLabel[RoomAccess.DND],
          action: async () => {
            await setAccess(RoomAccess.DND)
          }
        }
      ]
</script>

<div class="antiPopup p-4">
  <RadioGroup {items} gap={'large'} selected={room.access} />
</div>
