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
  import { AccountRole, Ref, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { Breadcrumb, Header, IconEdit, ModernButton, Scroller } from '@hcengineering/ui'
  import { Floor, ParticipantInfo, Room } from '@hcengineering/love'
  import { createEventDispatcher } from 'svelte'
  import lovePlg from '../plugin'
  import { currentRoom, floors, infos } from '../stores'
  import { calculateFloorSize } from '../utils'
  import ControlBar from './ControlBar.svelte'
  import FloorGrid from './FloorGrid.svelte'
  import RoomPreview from './RoomPreview.svelte'

  export let rooms: Room[] = []
  export let floor: Ref<Floor>

  const dispatch = createEventDispatcher()

  let floorContainer: HTMLDivElement

  $: selectedFloor = $floors.filter((fl) => fl._id === floor)[0]

  function getInfo (room: Ref<Room>, info: ParticipantInfo[]): ParticipantInfo[] {
    return info.filter((p) => p.room === room)
  }

  const me = getCurrentAccount()
  let editable: boolean = false
  $: editable = hasAccountRole(me, AccountRole.Maintainer)
  $: rows = calculateFloorSize(rooms) - 1
</script>

<div class="hulyComponent">
  <Header>
    <Breadcrumb title={selectedFloor?.name ?? ''} size={'large'} isCurrent />
    <svelte:fragment slot="actions">
      {#if editable}
        <ModernButton
          icon={IconEdit}
          label={lovePlg.string.EditOffice}
          size={'small'}
          on:click={() => dispatch('configure')}
        />
      {/if}
    </svelte:fragment>
  </Header>
  <div class="hulyComponent-content__column content">
    <Scroller padding={'1rem'} bottomPadding={'4rem'} horizontal>
      <FloorGrid bind:floorContainer {rows} preview>
        {#each rooms as room}
          <RoomPreview {room} info={getInfo(room._id, $infos)} />
        {/each}
      </FloorGrid>
    </Scroller>
  </div>
  {#if $currentRoom}
    <ControlBar room={$currentRoom} />
  {/if}
</div>
