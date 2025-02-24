<!--
// Copyright © 2024-2025 Hardcore Engineering Inc.
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
  import contact, { type Person } from '@hcengineering/contact'
  import {
    DrawingBoardToolbar,
    DrawingCmd,
    DrawingTool,
    DrawTextCmd,
    Point,
    drawing,
    makeCommandId
  } from '@hcengineering/presentation'
  import presence from '@hcengineering/presence'
  import { getResource } from '@hcengineering/platform'
  import { Loading, Component } from '@hcengineering/ui'
  import { onMount, onDestroy } from 'svelte'
  import { Array as YArray, Map as YMap } from 'yjs'

  export let boardId: string
  export let savedCmds: YArray<DrawingCmd>
  export let savedProps: YMap<any>
  export let grabFocus = false
  export let resizeable = false
  export let height: number | undefined = undefined
  export let readonly = false
  export let selected = false
  export let loading = false
  export let fullSize = false

  let tool: DrawingTool
  let penColor: string
  let penWidth: number
  let eraserWidth: number
  let fontSize: number
  let commands: DrawingCmd[] = []
  let offset: { x: number, y: number } = { x: 0, y: 0 }
  let changingCmdId: string | undefined
  let cmdEditor: HTMLDivElement | undefined
  let personCursorCanvasPos: Point | undefined
  let personCursorNodePos: Point | undefined
  let personCursorVisible = false
  let toolbar: HTMLDivElement
  let oldSelected = false
  let oldReadonly = false
  let sendLiveData: ((key: string, data: any) => void) | undefined
  let getFollowee: (() => Person | undefined) | undefined
  let panning = false
  let followee: Person | undefined
  const dataTopicOffset = 'drawing-board-offset'
  const dataTopicCursor = 'drawing-board-cursor'

  $: onSelectedChanged(selected)
  $: onReadonlyChanged(readonly)
  $: onOffsetChanged(offset)

  function listenSavedCommands (): void {
    commands = savedCmds.toArray()
  }

  function showCommandProps (id: string): void {
    changingCmdId = id
    for (const cmd of commands) {
      if (cmd.id === id) {
        if (cmd.type === 'text') {
          const textCmd = cmd as DrawTextCmd
          penColor = textCmd.color
          fontSize = textCmd.fontSize
        }
        break
      }
    }
  }

  function changeCommand (cmd: DrawingCmd): void {
    let index = -1
    for (let i = 0; i < savedCmds.length; i++) {
      if (savedCmds.get(i).id === cmd.id) {
        savedCmds.delete(i)
        index = i
        break
      }
    }
    if (index >= 0) {
      savedCmds.insert(index, [cmd])
    } else {
      savedCmds.push([cmd])
    }
    changingCmdId = undefined
    cmdEditor = undefined
  }

  function deleteCommand (id: string): void {
    for (let i = 0; i < savedCmds.length; i++) {
      if (savedCmds.get(i).id === id) {
        savedCmds.delete(i)
        break
      }
    }
    changingCmdId = undefined
    cmdEditor = undefined
  }

  function onSelectedChanged (selected: boolean): void {
    if (oldSelected !== selected) {
      if (oldSelected && !selected && changingCmdId !== undefined) {
        changingCmdId = undefined
        cmdEditor = undefined
      }
      oldSelected = selected
    }
  }

  function onReadonlyChanged (readonly: boolean): void {
    if (oldReadonly !== readonly) {
      if (!readonly) {
        let allHaveIds = true
        for (let i = 0; i < savedCmds.length; i++) {
          if (savedCmds.get(i).id === undefined) {
            allHaveIds = false
            break
          }
        }
        if (!allHaveIds) {
          const cmds = savedCmds.toArray()
          savedCmds.delete(0, savedCmds.length)
          savedCmds.push(cmds.map((cmd) => ({ ...cmd, id: cmd.id ?? makeCommandId() })))
        }
      }
      oldReadonly = readonly
    }
  }

  function onOffsetChanged (offset: Point): void {
    if (sendLiveData !== undefined) {
      sendLiveData(dataTopicOffset, { boardId, offset: { ...offset } })
    }
  }

  function onPointerMoved (canvasPos: Point): void {
    if (sendLiveData !== undefined && selected && !panning) {
      sendLiveData(dataTopicCursor, { boardId, cursorPos: { ...canvasPos } })
    }
  }

  function onFolloweeData (data: any): void {
    if (data === undefined) {
      followee = undefined
      personCursorVisible = false
      return
    }
    if (followee === undefined && getFollowee !== undefined) {
      followee = getFollowee()
    }
    if (data.boardId === boardId) {
      const newOffset = data.offset
      if (newOffset !== undefined && newOffset.x !== offset.x && newOffset.y !== offset.y) {
        offset = { ...newOffset }
      }
      const cursorPos = data.cursorPos
      if (cursorPos !== undefined) {
        personCursorVisible = true
        personCursorCanvasPos = { ...cursorPos }
      }
    }
  }

  onMount(() => {
    commands = savedCmds.toArray()
    savedCmds.observe(listenSavedCommands)

    getResource(presence.function.PublishData)
      .then((func) => {
        sendLiveData = func
      })
      .catch((err) => {
        console.error('Failed to get presence.function.PublishData', err)
      })
    getResource(presence.function.GetFollowee)
      .then((func) => {
        getFollowee = func
      })
      .catch((err) => {
        console.error('Failed to get presence.function.GetFollowee', err)
      })
    getResource(presence.function.FolloweeDataSubscribe)
      .then((subscribe) => {
        subscribe(dataTopicOffset, onFolloweeData)
        subscribe(dataTopicCursor, onFolloweeData)
      })
      .catch((err) => {
        console.error('Failed to get presence.function.FolloweeDataSubscribe', err)
      })
  })

  onDestroy(() => {
    savedCmds.unobserve(listenSavedCommands)

    getResource(presence.function.FolloweeDataUnsubscribe)
      .then((unsubscribe) => {
        unsubscribe(dataTopicOffset, onFolloweeData)
        unsubscribe(dataTopicCursor, onFolloweeData)
      })
      .catch((err) => {
        console.error('failed to get presence.function.FolloweeDataUnsubscribe', err)
      })
  })
</script>

{#if savedCmds !== undefined && savedProps !== undefined}
  {#if loading}
    <div
      class="board"
      class:fullSize
      class:selected={selected && !fullSize}
      style:flex-grow={resizeable ? undefined : '1'}
      style:height={resizeable ? `${height}px` : undefined}
    >
      <Loading />
      <slot />
    </div>
  {:else}
    <div
      class="board"
      class:fullSize
      class:selected={selected && !fullSize}
      style:flex-grow={resizeable ? undefined : '1'}
      style:height={resizeable ? `${height}px` : undefined}
      use:drawing={{
        readonly,
        autoSize: true,
        commands,
        offset,
        tool,
        penColor,
        penWidth,
        eraserWidth,
        fontSize,
        personCursorPos: personCursorCanvasPos,
        changingCmdId,
        cmdAdded: (cmd) => {
          savedCmds.push([cmd])
          changingCmdId = undefined
        },
        cmdChanging: showCommandProps,
        cmdChanged: changeCommand,
        cmdUnchanged: () => {
          changingCmdId = undefined
        },
        cmdDeleted: deleteCommand,
        panning: () => {
          panning = true
        },
        panned: (newOffset) => {
          panning = false
          offset = newOffset
        },
        editorCreated: (editor) => {
          cmdEditor = editor
        },
        pointerMoved: (canvasPos) => {
          onPointerMoved(canvasPos)
        },
        personCursorMoved: (nodePos) => {
          personCursorNodePos = nodePos
        }
      }}
    >
      {#if grabFocus}
        <!-- grab focus from the editor -->
        <!-- svelte-ignore a11y-autofocus -->
        <input style:opacity="0" autoFocus />
      {/if}
      {#if !readonly}
        <DrawingBoardToolbar
          placeInside={true}
          showPanTool={true}
          {cmdEditor}
          bind:toolbar
          bind:tool
          bind:penColor
          bind:penWidth
          bind:eraserWidth
          bind:fontSize
          on:clear={() => {
            savedCmds.delete(0, savedCmds.length)
            offset = { x: 0, y: 0 }
          }}
        />
      {/if}
      <slot />
      {#if personCursorVisible && personCursorNodePos !== undefined && followee !== undefined}
        <div class="personCursor" style:left={`${personCursorNodePos.x}px`} style:top={`${personCursorNodePos.y}px`}>
          <div class="personAvatar">
            <Component
              is={contact.component.Avatar}
              props={{
                size: 'small',
                person: followee,
                name: followee.name
              }}
            />
          </div>
          <div class="arrowFrame">
            <svg width="40px" height="40px" viewBox="0 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg">
              <path class="cursorArrow" d="m1.2 1.04v13.5l3.34-1.37 2.14 5 2.61-1.12-1.99-5 3.33-1.49z" />
            </svg>
          </div>
        </div>
      {/if}
    </div>
  {/if}
{/if}

<style lang="scss">
  .board {
    position: relative;
    width: 100%;
    background-color: var(--drawing-bg-color);
    border-radius: var(--small-BorderRadius);
    border: 1px solid var(--theme-navpanel-border);

    &.fullSize {
      border-radius: unset;
      border: none;
    }

    &.selected {
      border: 1px solid var(--theme-editbox-focus-border);
    }
  }

  .personCursor {
    position: absolute;
    z-index: 20;
    width: 40px;
    height: 40px;
  }

  .personAvatar {
    position: absolute;
    left: 7px;
    top: 17px;
    border-radius: 20%;
    box-shadow: 0.05rem 0.05rem 0.3rem rgba(0, 0, 0, 0.5);
  }

  .arrowFrame {
    position: absolute;
  }

  .cursorArrow {
    fill: #efefef;
    stroke: #222222;
    stroke-width: 1.2;
    stroke-linejoin: round;
    filter: drop-shadow(2px 2px 3px rgba(0, 0, 0, 0.3));
  }
</style>
