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
  import { IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import {
    AccordionItem,
    ButtonIcon,
    IconDelete,
    IconEdit,
    IconMoreH,
    IconSettings,
    Label,
    SelectPopup,
    eventToHTMLElement,
    showPopup,
    type SelectPopupValueType
  } from '@hcengineering/ui'
  import { Floor, ParticipantInfo, Room } from '@hcengineering/love'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../plugin'
  import { infos } from '../stores'
  import { calculateFloorSize } from '../utils'
  import EditFloorPopup from './EditFloorPopup.svelte'
  import FloorGrid from './FloorGrid.svelte'
  import RoomPreview from './RoomPreview.svelte'

  export let floor: Floor
  export let configurable: boolean = false
  export let rooms: Room[] = []
  export let selected: boolean
  export let disabled: boolean = false
  export let isOpen: boolean = false
  export let cropped: boolean = false
  export let showRoomName: boolean = false
  export let size: 'small' | 'medium' | 'large' = 'large'
  export let background: string | undefined = undefined
  export let kind: 'default' | 'second' | 'no-border' = 'default'
  export let configure: boolean = false

  const me = getCurrentAccount()
  const dispatch = createEventDispatcher()

  let floorContainer: HTMLDivElement
  let hovered: number = -1

  function getInfo (room: Ref<Room>, info: ParticipantInfo[]): ParticipantInfo[] {
    return info.filter((p) => p.room === room)
  }

  let roomName: IntlString | undefined = undefined

  function hover (e: CustomEvent<any>, n: number): void {
    roomName = e.detail.name
    hovered = n
  }

  $: editable = hasAccountRole(me, AccountRole.Maintainer)
  $: rows = calculateFloorSize(rooms) - (cropped ? 1 : 0)

  const client = getClient()

  async function remove (): Promise<void> {
    await client.remove(floor)
  }

  function renameFloor (): void {
    showPopup(EditFloorPopup, { id: floor._id }, 'top', () => {
      pressed = false
    })
  }

  let pressed: boolean = false
  const clickMore = (e: MouseEvent): void => {
    pressed = true
    const value: SelectPopupValueType[] = [{ id: 'rename', icon: IconEdit, label: plugin.string.RenameAFloor }]
    showPopup(SelectPopup, { value }, eventToHTMLElement(e), (result) => {
      if (result === 'configure') {
        dispatch('configure', floor)
        pressed = false
      } else if (result === 'rename') renameFloor()
    })
  }
</script>

<AccordionItem
  id={`floor-${floor._id}`}
  title={floor.name}
  {size}
  {background}
  {isOpen}
  selectable
  {selected}
  {disabled}
  {kind}
  categoryHeader
  contentAlign={'center'}
  on:select
>
  <svelte:fragment slot="actions">
    {#if showRoomName && roomName !== undefined}
      <span class="content-color overflow-label"><Label label={roomName} /></span>
    {/if}
    {#if configurable && editable}
      {#if rooms.length === 0}
        <div class="mr-2">
          <ButtonIcon icon={IconDelete} kind={'negative'} size={'small'} on:click={remove} />
        </div>
      {/if}
      <ButtonIcon icon={IconMoreH} kind={'tertiary'} size={'small'} {pressed} on:click={clickMore} />
    {/if}
  </svelte:fragment>
  <FloorGrid bind:floorContainer {rows} preview on:mouseover={() => (roomName = undefined)}>
    {#each rooms as room, i}
      <RoomPreview
        {room}
        info={getInfo(room._id, $infos)}
        preview
        on:hover={(e) => {
          hover(e, i)
        }}
      />
    {/each}
  </FloorGrid>
</AccordionItem>
