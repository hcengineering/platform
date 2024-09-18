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
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import ui, { Button, IconChevronLeft, ModernButton, Scroller } from '@hcengineering/ui'

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

<div class="root">
  {#if floorsSelector}
    {#each $floors as floor, i}
      <Button
        kind={'ghost'}
        size={'large'}
        on:click={() => {
          selectFloor(floor._id)
        }}
        justify={'left'}
        label={getEmbeddedLabel(floor.name)}
      />
      {#if i !== $floors.length - 1}<div class="divider" />{/if}
    {/each}
    <div class="flex-row-center flex-reverse mt-4 w-full">
      <ModernButton on:click={changeMode} icon={IconChevronLeft} label={ui.string.Back} />
    </div>
  {:else}
    {#if selectedFloor}
      <Scroller>
        <FloorPreview
          floor={selectedFloor}
          showRoomName
          rooms={getRooms($rooms, selectedFloor._id)}
          selected
          isOpen
          disabled
          cropped
          size={'small'}
          kind={'no-border'}
          background={'var(--theme-popup-color)'}
        />
      </Scroller>
    {/if}
    {#if $floors.length > 1}
      <div class="flex-row-center flex-reverse flex-no-shrink w-full mt-4">
        <ModernButton on:click={changeMode} icon={IconLayers} label={love.string.ChangeFloor} />
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .root {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    padding-right: 0.5rem;
    padding-bottom: 1rem;
  }
</style>
