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
  import { isOffice, ParticipantInfo, Room, RoomAccess, RoomType, MeetingStatus } from '@hcengineering/love'
  import { Icon, Label, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getClient } from '@hcengineering/presentation'
  import { openDoc } from '@hcengineering/view-resources'

  import love from '../plugin'
  import { myInfo, selectedRoomPlace, currentRoom, currentMeetingMinutes } from '../stores'
  import { getRoomLabel, lk, isConnected } from '../utils'
  import PersonActionPopup from './PersonActionPopup.svelte'
  import RoomLanguage from './RoomLanguage.svelte'

  export let room: Room
  export let info: ParticipantInfo[]
  export let preview: boolean = false
  export let hovered: boolean = false

  const dispatch = createEventDispatcher()

  const me = getCurrentAccount() as PersonAccount
  const meName = $personByIdStore.get(me.person)?.name
  const meAvatar = $personByIdStore.get(me.person)

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
    hovered = true
    dispatch('hover', { name: getRoomLabel(room, $personByIdStore) })
  }

  function mouseLeave (): void {
    hovered = false
  }

  async function openRoom (x: number, y: number): Promise<void> {
    const client = getClient()
    const hierarchy = client.getHierarchy()
    if ($isConnected && $currentRoom?._id === room._id) {
      let meeting = $currentMeetingMinutes
      if (meeting?.attachedTo !== room._id || meeting?.status !== MeetingStatus.Active) {
        meeting = await client.findOne(love.class.MeetingMinutes, {
          attachedTo: room._id,
          status: MeetingStatus.Active
        })
      }
      if (meeting === undefined) {
        await openDoc(hierarchy, room)
      } else {
        await openDoc(hierarchy, meeting)
      }
    } else {
      selectedRoomPlace.set({ _id: room._id, x, y })
      await openDoc(hierarchy, room)
    }
  }

  async function placeClickHandler (e: MouseEvent, x: number, y: number, person: Person | undefined): Promise<void> {
    e.stopPropagation()
    e.preventDefault()
    if (person !== undefined) {
      if ($myInfo === undefined) return
      showPopup(PersonActionPopup, { room, person: person._id }, eventToHTMLElement(e))
    } else {
      await openRoom(x, y)
    }
  }

  $: extraRow = calcExtraRows(hovered, room, info, $myInfo)

  function calcExtraRows (
    hovered: boolean,
    room: Room,
    info: ParticipantInfo[],
    myInfo: ParticipantInfo | undefined
  ): number {
    if (!hovered) return 0
    let maxX = info.reduce((acc, p) => {
      acc = Math.max(acc, p.x)
      return acc
    }, 0)
    maxX++
    let init = maxX > room.width ? maxX - room.width : 0

    for (let y = 0; y < room.height; y++) {
      for (let x = 0; x < room.width; x++) {
        if (info.find((p) => p.x === x && p.y === y) === undefined) {
          return init
        }
      }
    }
    if (myInfo?.room !== room._id) {
      init++
      while (init < 5) {
        const x = room.width + init
        for (let y = 0; y < room.height; y++) {
          if (info.find((p) => p.x === x && p.y === y) === undefined) {
            return init
          }
        }
        init++
      }
    }
    return init
  }

  async function handleClick (): Promise<void> {
    await openRoom(0, 0)
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<div
  class="floorGrid-room"
  class:preview
  class:hovered
  class:disabled
  class:myOffice={$myInfo?.room === room._id}
  style:--huly-floor-roomWidth={room.width + extraRow}
  style:--huly-floor-roomHeight={room.height}
  style:grid-column={`${room.x + 2} / span ${room.width + extraRow}`}
  style:grid-row={`${room.y + 2} / span ${room.height}`}
  style:grid-template-columns={`repeat(${room.width + extraRow}, 1fr)`}
  style:grid-template-rows={`repeat(${room.height}, 1fr)`}
  style:aspect-ratio={`${room.width + extraRow} / ${room.height}`}
  on:mouseover|stopPropagation
  on:mouseenter|stopPropagation={mouseEnter}
  on:mouseleave|stopPropagation={mouseLeave}
  on:click|stopPropagation={handleClick}
>
  {#each new Array(room.height) as _, y}
    {#each new Array(room.width + extraRow) as _, x}
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
        on:click={(e) => {
          placeClickHandler(e, x, y, person)
        }}
      >
        {#if personInfo}
          <Avatar name={person?.name ?? personInfo.name} {person} size={'full'} showStatus={false} />
        {:else if hoveredRoomX === x && hoveredRoomY === y}
          <Avatar name={meName} person={meAvatar} size={'full'} showStatus={false} />
        {/if}
      </div>
    {/each}
  {/each}

  {#if !preview}
    <div class="floorGrid-room__header">
      <span class="overflow-label text-md flex-grow">
        <Label label={getRoomLabel(room, $personByIdStore)} />
      </span>
      {#if !isOffice(room)}
        <RoomLanguage {room} />
      {/if}
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
