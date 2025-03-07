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
  import { DocumentUpdate, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import ui, {
    Button,
    IconMaxWidth,
    IconMinWidth,
    Breadcrumb,
    ButtonIcon,
    ModernButton,
    Header,
    IconAdd,
    Scroller,
    eventToHTMLElement,
    showPopup
  } from '@hcengineering/ui'
  import { Floor, GRID_WIDTH, Room, getFreeSpace } from '@hcengineering/love'
  import { createEventDispatcher } from 'svelte'
  import { floors, lockedRoom, loveUseMaxWidth } from '../stores'
  import { FloorSize, RGBAColor, ResizeInitParams, RoomSide, shadowError, shadowNormal } from '../types'
  import { calculateFloorSize, toggleLoveUseMaxWidth } from '../utils'
  import AddRoomPopup from './AddRoomPopup.svelte'
  import FloorGrid from './FloorGrid.svelte'
  import RoomConfigure from './RoomConfigure.svelte'
  import lovePlg from '../plugin'
  import { Contact } from '@hcengineering/contact'

  export let rooms: Room[] = []
  export let floor: Ref<Floor>
  export let excludedPersons: Ref<Contact>[] = []

  const client = getClient()
  const dispatch = createEventDispatcher()

  let divScroll: HTMLElement
  let resizeInitParams: ResizeInitParams | undefined = undefined
  let floorContainer: HTMLDivElement
  let floorRect: DOMRect
  let floorOffsetInline: number
  const floorSize: FloorSize = {
    cols: GRID_WIDTH + 2,
    rows: 5,
    width: 0,
    height: 0,
    cellSize: 4,
    cellTop: 2.5,
    cellRound: 0.75
  }
  const roomsConf: RoomConfigure[] = []
  let block: boolean = false
  let lockedID: number = -1
  let locked: { room: Room, size: DOMRect, map: boolean[][], side?: RoomSide } | undefined = undefined
  let dragged: { x: number, y: number, offsetX: number, offsetY: number } | undefined = undefined
  let dragRoom: RoomConfigure
  let dragShadow: boolean = false
  let oldX: number = -1
  let oldY: number = -1

  let cursor: string = ''
  $: document.body.style.cursor = cursor

  async function updateRoom (id: Ref<Room>): Promise<void> {
    if (locked !== undefined && resizeInitParams !== undefined) {
      const room = rooms.find((r) => r._id === id)
      if (room === undefined) {
        return
      }
      const update: DocumentUpdate<Room> = {}
      if (room.x !== resizeInitParams.x) {
        update.x = room.x
      }
      if (room.y !== resizeInitParams.y) {
        update.y = room.y
      }
      if (room.width !== resizeInitParams.width) {
        update.width = room.width
      }
      if (room.height !== resizeInitParams.height) {
        update.height = room.height
      }
      if (Object.keys(update).length > 0) {
        await client.update(room, update)
      }
    }
  }

  function addRoom (e: MouseEvent): void {
    showPopup(AddRoomPopup, { floor }, eventToHTMLElement(e))
  }

  $: selectedFloor = $floors.filter((fl) => fl._id === floor)[0]

  const setShadowColor = (color: RGBAColor): void => {
    const { r, g, b, a } = color
    if (dragged && dragRoom) dragRoom.setShadowColor(r, g, b, a)
    else if (roomsConf[lockedID]) roomsConf[lockedID].setShadowColor(r, g, b, a)
  }

  function startDragRoom (room: Room, size: DOMRect, n: number): void {
    if (room === undefined || size === undefined) return
    const map: boolean[][] = getFreeSpace(rooms, room, true)
    locked = { room, size, map }
    dragShadow = false
    lockedID = n
    divScroll.addEventListener('mousemove', dragMouseMove)
    window.addEventListener('mouseup', docMouseUp)
  }

  function dragMouseMove (e: MouseEvent): void {
    if ($lockedRoom === '' || block || dragged === undefined || locked === undefined) return
    block = true
    if (!dragShadow && dragged && dragRoom) {
      setShadowColor(shadowNormal)
      dragRoom.setShadow(0, 0, 2, 2)
      dragShadow = true
    }
    dragged.x = e.clientX - floorRect.x - dragged.offsetX + floorSize.cellRound
    dragged.y = e.clientY - floorRect.y - dragged.offsetY + floorSize.cellRound
    let newX: number = Math.round((dragged.x - floorSize.cellRound) / floorSize.cellSize)
    let newY: number = Math.round((dragged.y - floorSize.cellRound) / floorSize.cellSize)
    newX = newX < 1 ? 0 : newX + locked.room.width > GRID_WIDTH ? GRID_WIDTH - locked.room.width : newX - 1
    newY = newY < 1 ? 0 : newY - 1
    if (oldX !== newX || oldY !== newY) {
      let checkFree: boolean = true
      for (let y = newY; y < newY + locked.room.height; y++) {
        if (locked.map[y] === undefined) locked.map[y] = new Array(GRID_WIDTH).fill(true)
        for (let x = newX; x < newX + locked.room.width; x++) {
          if (locked.map[y][x] !== undefined && !locked.map[y][x]) checkFree = false
        }
      }
      if (checkFree) {
        locked.room.x = newX
        locked.room.y = newY
        setShadowColor(shadowNormal)
      } else {
        setShadowColor(shadowError)
      }
      oldX = newX
      oldY = newY
    }
    block = false
  }

  function startResizeRoom (room: Room, size: DOMRect, side: RoomSide, n: number): void {
    if (room === undefined || size === undefined || side === undefined) return
    const map: boolean[][] = getFreeSpace(rooms, room)
    locked = { room, size, map, side }
    lockedID = n
    window.addEventListener('mousemove', resizeMouseMove)
    window.addEventListener('mouseup', docMouseUp)
  }

  function resizeMouseMove (e: MouseEvent): void {
    if ($lockedRoom === '' || locked?.room === undefined || locked.side === undefined || block) return
    block = true
    const error: RoomSide = { top: false, bottom: false, left: false, right: false }
    const room: Room = locked.room
    locked.size = roomsConf[lockedID].getRect()

    if (locked.side.bottom || locked.side.top) {
      let newHeight: number = locked.side.bottom
        ? Math.round((e.clientY - locked.size.y - floorSize.cellRound) / floorSize.cellSize)
        : Math.round((locked.size.y - e.clientY + locked.size.height - floorSize.cellTop) / floorSize.cellSize)
      if (newHeight < 1) newHeight = 1
      let newY: number = locked.side.bottom ? room.y : room.y + room.height - newHeight
      if (newY < 0) {
        newHeight += newY
        newY = 0
      }
      let freeSpace: boolean = !(room.y === 0 && locked.side.top)
      if (freeSpace) {
        const startY: number = locked.side.bottom ? room.y + room.height : newY
        const endY: number = locked.side.bottom ? room.y + newHeight : room.y
        for (let y = startY; y < endY; y++) {
          if (y > 0 && locked.map[y] === undefined) locked.map[y] = new Array(GRID_WIDTH).fill(true)
          for (let x = room.x; x < room.x + room.width; x++) {
            if (locked.map[y][x] !== undefined && !locked.map[y][x]) freeSpace = false
          }
        }
      }
      if (locked.side.bottom) {
        if (e.clientY < locked.size.y + locked.size.height - 6) {
          error.bottom = locked.room.height === 1
        } else if (
          e.clientY >= locked.size.y + locked.size.height - 6 &&
          e.clientY < locked.size.y + locked.size.height + 6
        ) {
          error.bottom = false
        } else if (e.clientY >= locked.size.y + locked.size.height + 6) error.bottom = !freeSpace
      } else {
        if (e.clientY > locked.size.y - floorSize.cellTop + 6) {
          error.top = locked.room.height === 1
        } else if (
          e.clientY <= locked.size.y - floorSize.cellTop + 6 &&
          e.clientY > locked.size.y - floorSize.cellTop - 6
        ) {
          error.bottom = false
        } else if (e.clientY <= locked.size.y - floorSize.cellTop - 6) error.bottom = !freeSpace
      }
      if ((freeSpace && room.height < newHeight) || room.height > newHeight) {
        rooms[lockedID].height = newHeight
        if (locked.side.top) rooms[lockedID].y = newY
        locked.room = rooms[lockedID]
        locked.map = getFreeSpace(rooms, locked.room)
      }
    }

    if (locked.side.left || locked.side.right) {
      let newWidth: number = locked.side.right
        ? Math.round((e.clientX - locked.size.x - floorSize.cellRound) / floorSize.cellSize)
        : Math.round((locked.size.x - e.clientX + locked.size.width - floorSize.cellRound) / floorSize.cellSize)
      if (newWidth < 1) newWidth = 1
      let newX: number = locked.side.right ? room.x : room.x + room.width - newWidth
      if (newX < 0) {
        newWidth += newX
        newX = 0
      }
      if (newX + newWidth > GRID_WIDTH) newWidth = GRID_WIDTH - newX
      let freeSpace: boolean = !(
        (room.x === 0 && locked.side.left) ||
        (room.x + room.width === GRID_WIDTH && locked.side.right)
      )
      if (freeSpace) {
        const startX: number = locked.side.right ? room.x + room.width : newX
        const endX: number = locked.side.right ? room.x + newWidth : room.x
        for (let y = room.y; y < room.y + room.height; y++) {
          for (let x = startX; x < endX; x++) {
            if (locked.map[y][x] !== undefined && !locked.map[y][x]) freeSpace = false
          }
        }
      }
      if (locked.side.right) {
        if (e.clientX < locked.size.x + locked.size.width + floorSize.cellRound - 6) {
          error.right = locked.room.width === 1
        } else if (
          e.clientX >= locked.size.x + locked.size.width + floorSize.cellRound - 6 &&
          e.clientX < locked.size.x + locked.size.width + floorSize.cellRound + 6
        ) {
          error.right = false
        } else if (e.clientX >= locked.size.x + locked.size.width + floorSize.cellRound + 6) error.right = !freeSpace
      } else {
        if (e.clientX > locked.size.x - floorSize.cellRound + 6) {
          error.left = locked.room.width === 1
        } else if (
          e.clientX <= locked.size.x - floorSize.cellRound + 6 &&
          e.clientX > locked.size.x - floorSize.cellRound - 6
        ) {
          error.bottom = false
        } else if (e.clientX <= locked.size.x - floorSize.cellRound - 6) error.bottom = !freeSpace
      }
      if ((freeSpace && room.width < newWidth) || room.width > newWidth) {
        rooms[lockedID].width = newWidth
        if (locked.side.left) rooms[lockedID].x = newX
        locked.room = rooms[lockedID]
        locked.map = getFreeSpace(rooms, locked.room)
      }
    }

    setShadowColor(error.top || error.bottom || error.left || error.right ? shadowError : shadowNormal)
    block = false
  }

  function docMouseUp (e: MouseEvent): void {
    if (locked) updateRoom(locked.room._id)
    if (dragged !== undefined) {
      divScroll.removeEventListener('mousemove', dragMouseMove)
      dragged = undefined
      dragRoom.clearShadow()
    } else {
      window.removeEventListener('mousemove', resizeMouseMove)
      roomsConf[lockedID].clearShadow()
    }
    window.removeEventListener('mouseup', docMouseUp)
    cursor = ''
    lockedRoom.set('')
    lockedID = -1
  }
  $: rows = calculateFloorSize(rooms) + 2
</script>

<div class="hulyComponent">
  <Header allowFullsize adaptive={'disabled'}>
    <Breadcrumb title={selectedFloor?.name ?? ''} size={'large'} isCurrent />
    <svelte:fragment slot="actions">
      <ButtonIcon icon={IconAdd} size={'small'} on:click={addRoom} />
      <div class="hulyHeader-divider short" />
      <Button
        icon={$loveUseMaxWidth ? IconMaxWidth : IconMinWidth}
        kind={'regular'}
        pressed={$loveUseMaxWidth}
        size={'medium'}
        showTooltip={{ label: ui.string.UseMaxWidth }}
        on:click={toggleLoveUseMaxWidth}
      />
      <ModernButton
        label={lovePlg.string.FinalizeEditing}
        kind={'primary'}
        size={'small'}
        on:click={() => dispatch('configure')}
      />
    </svelte:fragment>
  </Header>
  <div class="hulyComponent-content__column content">
    <Scroller bind:divScroll padding={'1rem'} bottomPadding={'1rem'} horizontal>
      <FloorGrid
        bind:floorContainer
        {rows}
        useResize
        on:resize={(event) => {
          if (event.detail === undefined) return
          const { width, height } = event.detail
          floorSize.width = width
          floorSize.height = height
          floorSize.cellSize = width / (GRID_WIDTH + 2)
          floorSize.cellTop = (floorSize.cellSize / 3) * 1.6
          floorSize.cellRound = floorSize.cellSize / 5
          floorSize.rows = calculateFloorSize(rooms) + 2
        }}
      >
        {#each rooms as room, i}
          <RoomConfigure
            bind:this={roomsConf[i]}
            room={lockedID === i && dragged !== undefined && (locked?.room.x !== room.x || locked?.room.y !== room.y)
              ? { ...room, x: locked?.room.x ?? room.x, y: locked?.room.y ?? room.y }
              : room}
            placed={lockedID === i && dragged !== undefined && locked?.room.x === room.x && locked?.room.y === room.y}
            cellSize={floorSize.cellSize}
            {excludedPersons}
            on:cursor={(event) => {
              if (event.detail) cursor = event.detail
            }}
            on:resize={(event) => {
              if (event.detail === undefined) return
              const { room, size, side } = event.detail
              resizeInitParams = { x: room.x, y: room.y, width: room.width, height: room.height }
              floorRect = floorContainer.getBoundingClientRect()
              startResizeRoom(room, size, side, i)
            }}
            on:move={(event) => {
              if (event.detail === undefined) return
              const { room, size, offset } = event.detail
              floorRect = floorContainer.getBoundingClientRect()
              floorOffsetInline = floorRect.x - divScroll.getBoundingClientRect().x
              dragged = {
                x: size.x - floorRect.x + floorSize.cellRound,
                y: size.y - floorRect.y + floorSize.cellRound,
                offsetX: offset.x,
                offsetY: offset.y
              }
              resizeInitParams = { x: room.x, y: room.y, width: room.width, height: room.height }
              startDragRoom(room, size, i)
            }}
            on:updated={(event) => {
              if (event.detail !== undefined && locked) locked.size = event.detail
            }}
          />
        {/each}
      </FloorGrid>
      {#if lockedID !== -1 && dragged !== undefined && locked !== undefined}
        <RoomConfigure
          bind:this={dragRoom}
          room={locked.room}
          cellSize={floorSize.cellSize}
          top={dragged.y}
          left={dragged.x + floorOffsetInline - floorSize.cellRound}
        />
      {/if}
    </Scroller>
  </div>
</div>
