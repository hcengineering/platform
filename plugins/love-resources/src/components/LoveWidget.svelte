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
  import { AccountRole, getCurrentAccount, hasAccountRole, Ref } from '@hcengineering/core'
  import love, { Floor, Room } from '@hcengineering/love'
  import { Breadcrumbs, ButtonIcon, eventToHTMLElement, Header, IconAdd, Scroller, showPopup } from '@hcengineering/ui'
  import { floors, rooms, selectedFloor } from '../stores'
  import FloorPreview from './FloorPreview.svelte'
  import EditFloorPopup from './EditFloorPopup.svelte'

  let configure: boolean

  const me = getCurrentAccount()
  let floor: Floor | undefined

  $: if (floor === undefined && $floors.length > 0) {
    floor = $floors[0]
  }

  function getRooms (rooms: Room[], floor: Ref<Floor>): Room[] {
    return rooms.filter((p) => p.floor === floor)
  }

  function addFloor (e: MouseEvent): void {
    showPopup(EditFloorPopup, {}, eventToHTMLElement(e))
  }

  let editable: boolean = false
  $: editable = hasAccountRole(me, AccountRole.Maintainer)
</script>

<Header
  allowFullsize={false}
  type="type-aside"
  hideBefore={true}
  hideActions={false}
  hideDescription={true}
  adaptive="disabled"
  closeOnEscape={false}
  on:close
>
  <Breadcrumbs items={[{ label: love.string.Office }]} currentOnly />
  <svelte:fragment slot="extra">
    {#if editable}
      <ButtonIcon icon={IconAdd} kind={'primary'} size={'small'} on:click={addFloor} />
    {/if}
  </svelte:fragment>
</Header>
<div class="hulyModal-container noTopIndent type-aside">
  <div class="hulyModal-content">
    <Scroller>
      {#each $floors as _floor}
        <FloorPreview
          showRoomName
          floor={_floor}
          configurable
          configure={configure && floor?._id === _floor._id}
          rooms={getRooms($rooms, _floor._id)}
          selected={floor?._id === _floor._id}
          background={'var(--theme-panel-color)'}
          on:configure={() => {
            if (floor?._id === _floor._id) {
              configure = !configure
            } else {
              selectedFloor.set(_floor?._id)
              floor = _floor
              configure = true
            }
          }}
          on:select={() => {
            selectedFloor.set(_floor?._id)
            floor = _floor
          }}
        />
      {/each}
    </Scroller>
  </div>
</div>
