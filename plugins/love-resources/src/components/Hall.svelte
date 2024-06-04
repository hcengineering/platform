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
  import { Ref } from '@hcengineering/core'
  import { Floor as FloorType, Office, Room, isOffice } from '@hcengineering/love'
  import { activeFloor, floors, rooms } from '../stores'
  import Floor from './Floor.svelte'
  import FloorConfigure from './FloorConfigure.svelte'
  import Floors from './Floors.svelte'
  import { Contact, Person } from '@hcengineering/contact'

  export let visibleNav: boolean
  export let navFloat: boolean = false
  export let appsDirection: 'vertical' | 'horizontal' = 'horizontal'

  function getRooms (rooms: Room[], floor: Ref<FloorType>): Room[] {
    return rooms.filter((p) => p.floor === floor)
  }

  let selectedFloor = $activeFloor === '' ? $floors[0]?._id : $activeFloor

  let configure: boolean = false

  let excludedPersons: Ref<Contact>[] = []
  $: excludedPersons = $rooms
    .filter((p) => isOffice(p) && p.person !== null)
    .map((p) => (p as Office).person) as Ref<Person>[]
</script>

<Floors bind:visibleNav {navFloat} {appsDirection} bind:floor={selectedFloor} bind:configure />
<div class="antiPanel-component filledNav">
  {#if configure}
    <FloorConfigure
      rooms={getRooms($rooms, selectedFloor)}
      floor={selectedFloor}
      {visibleNav}
      {excludedPersons}
      on:change={(event) => (visibleNav = event.detail)}
      on:configure={() => (configure = false)}
    />
  {:else}
    <Floor
      rooms={getRooms($rooms, selectedFloor)}
      floor={selectedFloor}
      {visibleNav}
      on:change={(event) => (visibleNav = event.detail)}
      on:configure={() => (configure = true)}
    />
  {/if}
</div>
