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
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import ui, { Button, IconChevronLeft, ModernButton, Scroller } from '@hcengineering/ui'
  import { Floor, Room } from '@hcengineering/love'
  import { createEventDispatcher } from 'svelte'
  import love from '../plugin'
  import { floors, rooms } from '../stores'
  import FloorPreview from './FloorPreview.svelte'
  import IconLayers from './icons/Layers.svelte'

  export let selectedFloor: Floor | undefined

  function getRooms (rooms: Room[], floor: Ref<Floor>): Room[] {
    return rooms.filter((p) => p.floor === floor)
  }

  let floorsSelector: boolean = false

  const dispatch = createEventDispatcher()

  function changeMode (): void {
    floorsSelector = !floorsSelector
  }

  function selectFloor (_id: Ref<Floor>): void {
    dispatch('close', _id)
  }
</script>

<div class="antiPopup p-4">
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
  .antiPopup {
    width: 36rem;
    max-width: 36rem;
  }

  .divider {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid var(--theme-divider-color);
  }
</style>
