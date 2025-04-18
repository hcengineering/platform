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
  import { Contact, Person } from '@hcengineering/contact'
  import { personByIdStore } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import love, { Floor as FloorType, Office, Room, RoomInfo, isOffice } from '@hcengineering/love'
  import { getClient } from '@hcengineering/presentation'
  import { deviceOptionsStore as deviceInfo, getCurrentLocation, navigate } from '@hcengineering/ui'
  import { onDestroy, onMount } from 'svelte'
  import {
    activeFloor,
    floors,
    infos,
    invites,
    myInfo,
    myRequests,
    rooms,
    selectedFloor,
    waitForOfficeLoaded
  } from '../stores'
  import { connectToMeeting, tryConnect } from '../utils'
  import Floor from './Floor.svelte'
  import FloorConfigure from './FloorConfigure.svelte'

  function getRooms (rooms: Room[], floor: Ref<FloorType>): Room[] {
    return rooms.filter((p) => p.floor === floor)
  }

  $: floor = $selectedFloor ?? ($activeFloor === '' ? $floors[0]?._id : $activeFloor)
  let configure: boolean = false
  let replacedPanel: HTMLElement

  let excludedPersons: Ref<Contact>[] = []
  $: excludedPersons = $rooms
    .filter((p) => isOffice(p) && p.person !== null)
    .map((p) => (p as Office).person) as Ref<Person>[]

  $: $deviceInfo.replacedPanel = replacedPanel
  onDestroy(() => ($deviceInfo.replacedPanel = undefined))

  async function connectToSession (sessionId: string): Promise<void> {
    const client = getClient()
    const info = await client.findOne(love.class.RoomInfo, { _id: sessionId as Ref<RoomInfo> })
    if (info === undefined) return
    const room = $rooms.find((p) => p._id === info.room)
    if (room === undefined) return
    tryConnect(
      $personByIdStore,
      $myInfo,
      room,
      $infos.filter((p) => p.room === room._id),
      $myRequests,
      $invites
    )
  }

  onMount(async () => {
    const loc = getCurrentLocation()
    const { sessionId, meetId, ...query } = loc.query ?? {}
    loc.query = Object.keys(query).length === 0 ? undefined : query
    navigate(loc, true)
    if (sessionId) {
      await waitForOfficeLoaded()
      await connectToSession(sessionId)
    } else if (meetId) {
      await waitForOfficeLoaded()
      await connectToMeeting($personByIdStore, $myInfo, $infos, $myRequests, $invites, meetId)
    }
  })
</script>

<div class="antiPanel-component filledNav" bind:this={replacedPanel}>
  {#if configure}
    <FloorConfigure
      rooms={getRooms($rooms, floor)}
      {floor}
      {excludedPersons}
      on:configure={() => (configure = false)}
    />
  {:else}
    <Floor rooms={getRooms($rooms, floor)} {floor} on:configure={() => (configure = true)} on:open />
  {/if}
</div>
