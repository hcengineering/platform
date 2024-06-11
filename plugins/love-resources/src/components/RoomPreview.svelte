<!--
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { Person, type PersonAccount } from '@hcengineering/contact'
  import { Avatar, personByIdStore } from '@hcengineering/contact-resources'
  import { IdMap, getCurrentAccount } from '@hcengineering/core'
  import { Icon, Label } from '@hcengineering/ui'
  import { ParticipantInfo, Room, RoomAccess, RoomType } from '@hcengineering/love'
  import love from '../plugin'
  import { invites, myInfo, myRequests } from '../stores'
  import { getRoomLabel, invite, tryConnect } from '../utils'
  import { createEventDispatcher } from 'svelte'

  export let room: Room
  export let info: ParticipantInfo[]
  export let preview: boolean = false
  export let hovered: boolean = false

  const dispatch = createEventDispatcher()

  const me = getCurrentAccount() as PersonAccount
  const meName = $personByIdStore.get(me.person)?.name
  const meAvatar = $personByIdStore.get(me.person)

  let container: HTMLDivElement
  let hoveredRoomX: number | undefined = undefined
  let hoveredRoomY: number | undefined = undefined

  $: disabled = room._class === love.class.Office && info.length === 0

  function getPerson (info: ParticipantInfo | undefined, employees: IdMap<Person>): Person | undefined {
    if (info !== undefined) {
      return employees.get(info.person)
    }
  }

  function getPersonInfo (y: number, x: number, info: ParticipantInfo[]): ParticipantInfo | undefined {
    return info.find((p) => p.x === x && p.y === y)
  }

  function mouseEnter (): void {
    dispatch('hover', { name: getRoomLabel(room, $personByIdStore) })
  }

  function clickHandler (x: number, y: number, person: Person | undefined): void {
    if (person !== undefined) {
      if (room._id === $myInfo?.room) return
      invite(person._id, $myInfo?.room)
    } else {
      tryConnect($personByIdStore, $myInfo, room, info, $myRequests, $invites, { x, y })
    }
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<div
  bind:this={container}
  class="floorGrid-room"
  class:preview
  class:hovered
  class:disabled
  class:myOffice={$myInfo?.room === room._id}
  style:--huly-floor-roomWidth={room.width}
  style:--huly-floor-roomHeight={room.height}
  style:grid-column={`${room.x + 2} / span ${room.width}`}
  style:grid-row={`${room.y + 2} / span ${room.height}`}
  style:grid-template-columns={`repeat(${room.width}, 1fr)`}
  style:grid-template-rows={`repeat(${room.height}, 1fr)`}
  style:aspect-ratio={`${room.width} / ${room.height}`}
  on:mouseenter|stopPropagation={mouseEnter}
>
  {#each new Array(room.height) as _, y}
    {#each new Array(room.width) as _, x}
      {@const personInfo = getPersonInfo(y, x, info)}
      {@const person = getPerson(personInfo, $personByIdStore)}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="floorGrid-room__field"
        class:hovered={hoveredRoomX === x && hoveredRoomY === y}
        class:person={personInfo || person || $myInfo?.room === room._id}
        on:mouseenter={() => {
          if (!(personInfo || person) && !disabled && $myInfo?.room !== room._id) {
            hoveredRoomX = x
            hoveredRoomY = y
          }
        }}
        on:mouseout={() => {
          hoveredRoomX = undefined
          hoveredRoomY = undefined
        }}
        on:click={() => {
          clickHandler(x, y, person)
        }}
      >
        {#if personInfo}
          <Avatar name={person?.name ?? personInfo.name} {person} size={'full'} />
        {:else if hoveredRoomX === x && hoveredRoomY === y}
          <Avatar name={meName} person={meAvatar} size={'full'} />
        {/if}
      </div>
    {/each}
  {/each}

  {#if !preview}
    <div class="floorGrid-room__header">
      <span class="overflow-label text-md flex-grow">
        <Label label={getRoomLabel(room, $personByIdStore)} />
      </span>
      {#if room.access === RoomAccess.DND || room.type === RoomType.Video}
        <div class="flex-row-center flex-no-shrink h-full flex-gap-2">
          {#if room.access === RoomAccess.DND}
            <Icon icon={love.icon.DND} size={'small'} />
          {/if}
          {#if room.type === RoomType.Video}
            <Icon icon={love.icon.CamEnabled} size={'small'} />
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
