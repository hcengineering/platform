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
  import { Floor, Room } from '@hcengineering/love'
  import { Ref } from '@hcengineering/core'
  import ui, { IconChevronLeft, ModernButton, Scroller } from '@hcengineering/ui'
  import FloorPreview from './FloorPreview.svelte'
  import { floors, rooms } from '../stores'
  import IconLayers from './icons/Layers.svelte'
  import love from '../plugin'

  let selectedFloor: Floor | undefined
  let floorsSelector: boolean = false

  $: if (selectedFloor === undefined && $floors.length > 0) {
    selectedFloor = $floors[0]
  }

  function getRooms (rooms: Room[], floor: Ref<Floor>): Room[] {
    return rooms.filter((p) => p.floor === floor)
  }

  function changeMode (): void {
    floorsSelector = !floorsSelector
  }

  function selectFloor (_id: Ref<Floor>): void {
    selectedFloor = $floors.find((p) => p._id === _id)
    floorsSelector = false
  }
</script>

<div class="hulyModal-container noTopIndent type-aside">
  <div class="hulyModal-content">
    <Scroller>
      {#if floorsSelector}
        {#each $floors as _floor}
          <FloorPreview
            showRoomName
            floor={_floor}
            rooms={getRooms($rooms, _floor._id)}
            selected={selectedFloor?._id === _floor._id}
            kind={'no-border'}
            background={'var(--theme-panel-color)'}
            on:select={() => {
              selectFloor(_floor._id)
            }}
          />
        {/each}
      {:else if selectedFloor}
        <FloorPreview
          floor={selectedFloor}
          showRoomName
          rooms={getRooms($rooms, selectedFloor._id)}
          selected
          isOpen
          disabled
          cropped
          kind={'no-border'}
          background={'var(--theme-panel-color)'}
        />
      {/if}
    </Scroller>
  </div>
  {#if floorsSelector || $floors.length > 1}
    <div class="hulyModal-footer">
      <ModernButton
        on:click={changeMode}
        icon={floorsSelector ? IconChevronLeft : IconLayers}
        label={floorsSelector ? ui.string.Back : love.string.ChangeFloor}
      />
    </div>
  {/if}
</div>
