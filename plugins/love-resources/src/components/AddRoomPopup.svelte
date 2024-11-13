<script lang="ts">
  import core, { Class, Data, generateId, makeCollaborativeDoc, Ref } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Button, DropdownIntlItem } from '@hcengineering/ui'
  import { Floor, Office, Room, RoomAccess, RoomType, getFreePosition } from '@hcengineering/love'
  import love from '../plugin'
  import { rooms } from '../stores'
  import { createEventDispatcher } from 'svelte'

  export let floor: Ref<Floor>

  const dispatch = createEventDispatcher()

  type TypeIds = 'meetingRoom' | 'teamRoom' | 'office'

  interface Item extends DropdownIntlItem {
    id: TypeIds
    type: RoomType
    _class: Ref<Class<Room>>
    access: RoomAccess
  }

  const items: Item[] = [
    {
      id: 'meetingRoom',
      label: love.string.MeetingRoom,
      type: RoomType.Video,
      _class: love.class.Room,
      access: RoomAccess.Open
    },
    {
      id: 'teamRoom',
      label: love.string.TeamRoom,
      type: RoomType.Audio,
      _class: love.class.Room,
      access: RoomAccess.Open
    },
    {
      id: 'office',
      label: love.string.Office,
      type: RoomType.Audio,
      _class: love.class.Office,
      access: RoomAccess.Knock
    }
  ] as const

  async function createRoom (value: TypeIds): Promise<void> {
    const val = items.find((i) => i.id === value)
    if (val === undefined) return
    const client = getClient()
    const floorRooms = $rooms.filter((r) => r.floor === floor)
    const pos = getFreePosition(floorRooms, 2, 1)
    const _id = generateId<Room>()
    const data: Data<Room> = {
      floor,
      name: val._class === love.class.Office ? '' : await translate(val.label, {}),
      x: pos.x,
      y: pos.y,
      width: 2,
      height: 1,
      type: val.type,
      access: val.access,
      language: 'en',
      startWithTranscription: val._class !== love.class.Office && val.type === RoomType.Video,
      description: makeCollaborativeDoc(_id, 'description')
    }
    if (val._class === love.class.Office) {
      ;(data as Data<Office>).person = null
    }
    await client.createDoc(val._class, core.space.Workspace, data, _id)
    dispatch('close')
  }
</script>

<div class="antiPopup p-4 flex-gap-2">
  {#each items as item}
    <div>
      <Button label={item.label} on:click={() => createRoom(item.id)} />
    </div>
  {/each}
</div>

<style lang="scss">
  .antiPopup {
    flex-direction: row;
  }
</style>
