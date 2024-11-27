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
  import {
    ButtonIcon,
    IconAdd,
    Label,
    Scroller,
    Separator,
    defineSeparators,
    eventToHTMLElement,
    showPopup,
    deviceOptionsStore as deviceInfo
  } from '@hcengineering/ui'
  import { Floor as FloorType, Room } from '@hcengineering/love'
  import love from '../plugin'
  import { floors, rooms } from '../stores'
  import { loveSeparators } from '../types'
  import EditFloorPopup from './EditFloorPopup.svelte'
  import FloorPreview from './FloorPreview.svelte'

  export let floor: Ref<FloorType>
  export let configure: boolean

  const me = getCurrentAccount()

  function getRooms (rooms: Room[], floor: Ref<FloorType>): Room[] {
    return rooms.filter((p) => p.floor === floor)
  }

  function addFloor (e: MouseEvent): void {
    showPopup(EditFloorPopup, {}, eventToHTMLElement(e))
  }

  let editable: boolean = false
  $: editable = hasAccountRole(me, AccountRole.Maintainer)

  defineSeparators('love', loveSeparators)
</script>

{#if $deviceInfo.navigator.visible}
  <div
    class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal'
      ? 'portrait'
      : 'landscape'} border-left will-change-opacity"
    class:fly={$deviceInfo.navigator.float}
  >
    <div class="antiPanel-wrap__content hulyNavPanel-container">
      <div class="hulyNavPanel-header" class:withButton={editable}>
        <span class="overflow-label">
          <Label label={love.string.Floors} />
        </span>
        {#if editable}
          <ButtonIcon icon={IconAdd} kind={'primary'} size={'small'} on:click={addFloor} />
        {/if}
      </div>
      <Scroller fade={{ multipler: { top: 4, bottom: 0 } }} shrink>
        {#each $floors as _floor}
          <FloorPreview
            showRoomName
            floor={_floor}
            configurable
            configure={configure && floor === _floor._id}
            rooms={getRooms($rooms, _floor._id)}
            selected={floor === _floor._id}
            background={'var(--theme-navpanel-color)'}
            on:configure={() => {
              if (floor === _floor._id) {
                configure = !configure
              } else {
                floor = _floor._id
                configure = true
              }
            }}
            on:select={() => {
              floor = _floor._id
            }}
          />
        {/each}
      </Scroller>
    </div>
    <Separator name={'love'} float={$deviceInfo.navigator.float ? 'navigator' : true} index={0} color={'transparent'} />
  </div>
  <Separator
    name={'love'}
    float={$deviceInfo.navigator.float}
    index={0}
    color={'transparent'}
    separatorSize={0}
    short
  />
{/if}
