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
  import { Scroller } from '@hcengineering/ui'
  import { ParticipantInfo, Room } from '@hcengineering/love'
  import { infos } from '../stores'
  import { calculateFloorSize } from '../utils'
  import FloorGrid from './FloorGrid.svelte'
  import RoomPreview from './RoomPreview.svelte'

  export let rooms: Room[] = []

  let floorContainer: HTMLDivElement

  function getInfo (room: Ref<Room>, info: ParticipantInfo[]): ParticipantInfo[] {
    return info.filter((p) => p.room === room)
  }

  $: rows = calculateFloorSize(rooms) - 1
</script>

<Scroller padding="1rem" bottomPadding="4rem" horizontal>
  <FloorGrid bind:floorContainer {rows} preview>
    {#each rooms as room}
      <RoomPreview {room} info={getInfo(room._id, $infos)} on:open />
    {/each}
  </FloorGrid>
</Scroller>
