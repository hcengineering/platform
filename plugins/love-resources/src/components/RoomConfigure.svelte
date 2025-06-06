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
  import contact, { Contact, Person } from '@hcengineering/contact'
  import { AssigneeBox, personByIdStore } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { ActionIcon, EditBox, Icon, IconDelete, resizeObserver } from '@hcengineering/ui'
  import { Room, RoomAccess, RoomType, isOffice } from '@hcengineering/love'
  import { createEventDispatcher, onMount } from 'svelte'
  import { cubicOut } from 'svelte/easing'
  import { tweened } from 'svelte/motion'
  import love from '../plugin'
  import { infos, lockedRoom } from '../stores'
  import { RoomSide, shadowNormal } from '../types'
  import { getRoomLabel } from '../utils'

  export let room: Room
  export let cellSize: number
  export let top: number | undefined = undefined
  export let left: number | undefined = undefined
  export let placed: boolean = false
  export let excludedPersons: Ref<Contact>[] = []

  const client = getClient()

  const SHADOW_OFFSET = 3
  const SHADOW_BLUR = 2
  const SHADOW_SPREAD = -1

  async function updateName (): Promise<void> {
    await client.update(room, { name: room.name })
  }

  async function changePerson (e: CustomEvent<Ref<Person> | null>): Promise<void> {
    if (isOffice(room)) {
      const value = e.detail
      const prevValue = room.person
      await client.update(room, { person: value })
      if (prevValue != null) {
        const currentInfo = $infos.find((p) => p.room === room._id && p.person === prevValue)
        if (currentInfo !== undefined) {
          await client.update(currentInfo, { room: love.ids.Reception })
        }
      }
      if (value != null) {
        const currentInfo = $infos.find((p) => p.room === love.ids.Reception && p.person === value)
        if (currentInfo !== undefined) {
          await client.update(currentInfo, { room: room._id })
        }
      }
    }
  }

  async function remove (): Promise<void> {
    await client.remove(room)
  }

  $: removable = $infos.filter((i) => i.room === room._id).length === 0
  $: dispatch('cursor', cursor)
  $: zoomOut = cellSize < 40

  const dispatch = createEventDispatcher()

  let container: HTMLDivElement
  let cursor: string = ''
  let dragStyle: string | undefined = undefined
  const roomSide: RoomSide = { top: false, bottom: false, left: false, right: false }
  let roomRect: DOMRect

  const shadow = tweened({ x: 0, y: 0, r: 0, s: 0 }, { duration: 150, easing: cubicOut })
  const shadowColor = tweened(shadowNormal, { duration: 300, easing: cubicOut })

  export function setShadow (x: number, y: number, r: number, s?: number) {
    shadow.set({ x, y, r, s: s ?? 0 })
  }
  export function setShadowColor (r: number, g: number, b: number, a: number) {
    shadowColor.set({ r, g, b, a })
  }
  export function clearShadow () {
    shadow.set({ x: 0, y: 0, r: 1, s: 0 })
    shadowColor.set({ ...shadowNormal, a: 0 })
  }
  export function getRect (): DOMRect {
    return container ? container.getBoundingClientRect() : new DOMRect()
  }
  function checkLeave () {
    if ($lockedRoom !== '') return
    cursor = ''
    clearShadow()
  }

  function mouseDown (e: MouseEvent): void {
    if (container === undefined || $lockedRoom !== '') return
    roomRect = container.getBoundingClientRect()
    if (roomSide.top || roomSide.bottom || roomSide.left || roomSide.right) {
      dispatch('resize', { room, size: roomRect, side: roomSide })
    } else if (cursor === 'all-scroll') {
      dispatch('move', {
        room,
        size: roomRect,
        offset: {
          x: e.clientX - roomRect.left,
          y: e.clientY - roomRect.top
        }
      })
    }
    lockedRoom.set(room._id)
  }

  function changeCursor (e: MouseEvent): void {
    if ($lockedRoom !== '') return
    roomRect = container.getBoundingClientRect()
    const offsetX = e.clientX - roomRect.x + cellSize / 5
    const offsetY = e.clientY - roomRect.y + (cellSize / 3) * 1.6
    roomSide.top = offsetY <= 12
    roomSide.left = offsetX <= 12
    roomSide.bottom = offsetY >= roomRect.height + (cellSize / 3) * 1.6 + cellSize / 5 + -12
    roomSide.right = offsetX >= roomRect.width + (cellSize / 5) * 2 - 12

    if (roomSide.left) {
      if (roomSide.top) cursor = 'nwse-resize'
      else if (roomSide.bottom) cursor = 'nesw-resize'
      else cursor = 'ew-resize'
    } else if (roomSide.right) {
      if (roomSide.top) cursor = 'nesw-resize'
      else if (roomSide.bottom) cursor = 'nwse-resize'
      else cursor = 'ew-resize'
    } else if (roomSide.top || roomSide.bottom) cursor = 'ns-resize'
    else cursor = 'all-scroll'

    shadow.set({
      x: roomSide.left ? -SHADOW_OFFSET : roomSide.right ? SHADOW_OFFSET : 0,
      y: roomSide.top ? -SHADOW_OFFSET : roomSide.bottom ? SHADOW_OFFSET : 0,
      r: roomSide.top || roomSide.bottom || roomSide.left || roomSide.right ? SHADOW_BLUR : 0,
      s: SHADOW_SPREAD
    })
    shadowColor.set(shadowNormal)
  }

  $: showButtons = room.access === RoomAccess.DND || room.type === RoomType.Video || removable
  $: updateStyle(top, left, room, roomRect)

  const updateStyle = (t: number | undefined, l: number | undefined, r: Room, rect: DOMRect): void => {
    dragStyle =
      t && l && r && rect
        ? `top: ${top}px; left: ${left}px; width: ${room.width * cellSize}px; height: ${room.height * cellSize};`
        : undefined
  }

  onMount(() => {
    if (container) roomRect = container.getBoundingClientRect()
  })
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  bind:this={container}
  use:resizeObserver={() => {
    roomRect = container.getBoundingClientRect()
    if ($lockedRoom === room._id) dispatch('updated', roomRect)
  }}
  class="floorGrid-configureRoom"
  class:dragged={top !== undefined || left !== undefined}
  class:placed
  style={dragStyle}
  style:--huly-floor-roomWidth={room.width}
  style:--huly-floor-roomHeight={room.height}
  style:--huly-floor-roomShadow={`var(--theme-popup-shadow), ${$shadow.x}px ${$shadow.y}px ${$shadow.r}px ${$shadow.s}px rgba(${$shadowColor.r}, ${$shadowColor.g}, ${$shadowColor.b}, ${$shadowColor.a})`}
  style:grid-column={`${room.x + 2} / span ${room.width}`}
  style:grid-row={`${room.y + 2} / span ${room.height}`}
  style:grid-template-columns={`repeat(${room.width}, 1fr)`}
  style:grid-template-rows={`repeat(${room.height}, 1fr)`}
  style:aspect-ratio={`${room.width} / ${room.height}`}
  style:pointer-events={$lockedRoom !== '' ? 'none' : 'all'}
  on:mousemove={changeCursor}
  on:mouseleave={checkLeave}
  on:mousedown={mouseDown}
>
  {#each new Array(room.height) as _, rY}
    {#each new Array(room.width) as _, rX}
      <div
        class="floorGrid-configureRoom__field"
        class:null={!(isOffice(room) && rX === 0 && rY === 0)}
        on:mousedown={(e) => {
          if (isOffice(room) && rX === 0 && rY === 0) e.stopPropagation()
        }}
      >
        {#if isOffice(room) && rX === 0 && rY === 0}
          <AssigneeBox
            _class={contact.class.Person}
            excluded={excludedPersons}
            shouldShowName={false}
            showNavigate={false}
            width={'100%'}
            label={contact.string.Person}
            value={room.person}
            avatarSize={'full'}
            on:change={changePerson}
          />
        {/if}
      </div>
    {/each}
  {/each}
  <div class="floorGrid-configureRoom__header">
    <EditBox
      bind:value={room.name}
      on:change={updateName}
      placeholder={getRoomLabel(room, $personByIdStore)}
      kind={'editbox'}
    />
    {#if showButtons}
      <div
        class="flex-row-center flex-no-shrink h-full {zoomOut ? 'flex-gap-1' : 'flex-gap-2'}"
        on:mousedown|stopPropagation
      >
        {#if room.access === RoomAccess.DND}
          <Icon icon={love.icon.DND} size={zoomOut ? 'x-small' : 'small'} />
        {/if}
        {#if room.type === RoomType.Video}
          <Icon icon={love.icon.CamEnabled} size={zoomOut ? 'x-small' : 'small'} />
        {/if}
        {#if removable}
          <ActionIcon icon={IconDelete} size={zoomOut ? 'x-small' : 'small'} action={remove} />
        {/if}
      </div>
    {/if}
  </div>
</div>
