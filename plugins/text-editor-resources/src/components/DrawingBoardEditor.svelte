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
    drawing,
    CommandUid,
    Point,
    DrawingCommandsProcessor,
    ThemeAwareColor,
    ColorsList,
    ColorMetaNameOrHex
  } from '@hcengineering/presentation'
  import presence from '@hcengineering/presence'
  import { getResource } from '@hcengineering/platform'
  import { Loading, Component, themeStore } from '@hcengineering/ui'
  import { onMount, onDestroy } from 'svelte'
  import { Array as YArray, Map as YMap, Doc as YDoc } from 'yjs'
  import { get } from 'svelte/store'

  export let boardId: string
  export let document: YDoc
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
  let penColor: ColorMetaNameOrHex
  let penWidth: number
  let eraserWidth: number
  let fontSize: number
  let model: DrawingCmd[] = []
  let offset: { x: number, y: number } = { x: 0, y: 0 }
  let changingCmdId: CommandUid | undefined
  let cmdEditor: HTMLDivElement | undefined
  let personCursorCanvasPos: Point | undefined
  let personCursorNodePos: Point | undefined
  let personCursorVisible = false
  let toolbar: HTMLDivElement
  let oldSelected = false
  let oldReadonly = false
  let sendLiveData: ((key: string, data: any) => void) | undefined
  let getFollowee: (() => Promise<Person | undefined>) | undefined
  let panning = false
  let followee: Person | undefined

  const themeChangeUnsubscribe: Array<() => void> = []

  const DrawingColorPalette: ColorsList = [
    ['alpha', new ThemeAwareColor('#FFF', '#000')],
    ['gamma', new ThemeAwareColor('Fuchsia', 'Fuchsia')],
    ['delta', new ThemeAwareColor('Houseplant', 'Houseplant')],
    ['epsilon', new ThemeAwareColor('Sky', 'Waterway')],
    ['zeta', new ThemeAwareColor('Turquoise', 'Ocean')],
    ['eta', new ThemeAwareColor('Pink', 'Firework')],
    ['theta', new ThemeAwareColor('Cloud', 'Porpoise')],
    ['iota', new ThemeAwareColor('#705201', '#FFC114')],
    ['kappa', new ThemeAwareColor('Lavander', 'Mauve')]
  ]

  const dataTopicOffset = 'drawing-board-offset'
  const dataTopicCursor = 'drawing-board-cursor'

  let disableUndo = false
  let disableRedo = false

  const commandsProcessor = new DrawingCommandsProcessor(document, savedCmds)

  $: onSelectedChanged(selected)
  $: onReadonlyChanged(readonly)
  $: onOffsetChanged(offset)

  function onSavedCommandsChanged (): void {
    model = commandsProcessor.snapshot()
    setTimeout(() => {
      const status = commandsProcessor.getUndoRedoAvailability()
      disableUndo = status.undoDisabled
      disableRedo = status.redoDisabled
    })
  }

  function showCommandProps (id: CommandUid): void {
    changingCmdId = id
    for (const command of model) {
      if (command.id === id) {
        if (command.type === 'text') {
          const textWriting = command as DrawTextCmd
          penColor = textWriting.color
          fontSize = textWriting.fontSize
        }
        break
      }
    }
  }

  function changeCommand (cmd: DrawingCmd): void {
    changingCmdId = undefined
    cmdEditor = undefined
    commandsProcessor.changeCommand(cmd)
  }

  function deleteCommand (id: CommandUid): void {
    changingCmdId = undefined
    cmdEditor = undefined
    commandsProcessor.deleteCommand(id)
  }

  function onSelectedChanged (newSelected: boolean): void {
    if (oldSelected !== newSelected) {
      if (oldSelected && !newSelected && changingCmdId !== undefined) {
        changingCmdId = undefined
        cmdEditor = undefined
      }
      oldSelected = newSelected
    }
  }

  function onReadonlyChanged (newReadonly: boolean): void {
    if (oldReadonly !== newReadonly) {
      if (!newReadonly) {
        commandsProcessor.ensureAllCommandsWithUids()
      }
      oldReadonly = newReadonly
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

  async function onFolloweeData (data: any): Promise<void> {
    if (data === undefined) {
      followee = undefined
      personCursorVisible = false
      return
    }
    if (followee === undefined && getFollowee !== undefined) {
      followee = await getFollowee()
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
    onSavedCommandsChanged()
    savedCmds.observe(onSavedCommandsChanged)

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
    themeChangeUnsubscribe.forEach((unsubscribe) => {
      unsubscribe()
    })
    themeChangeUnsubscribe.length = 0

    savedCmds.unobserve(onSavedCommandsChanged)

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
        colorsList: DrawingColorPalette,
        readonly,
        getCurrentTheme: () => $themeStore.variant,
        subscribeOnThemeChange: (callback) => {
          themeChangeUnsubscribe.push(themeStore.subscribe(callback))
        },
        autoSize: true,
        commands: model,
        offset,
        tool,
        penColor,
        penWidth,
        eraserWidth,
        fontSize,
        personCursorPos: personCursorCanvasPos,
        changingCmdId,
        cmdAdded: (commandToAdd) => {
          commandsProcessor.addCommand(commandToAdd)
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
          colorsList={DrawingColorPalette}
          {cmdEditor}
          {disableUndo}
          {disableRedo}
          bind:toolbar
          bind:tool
          bind:penColor
          bind:penWidth
          bind:eraserWidth
          bind:fontSize
          on:clear={() => {
            commandsProcessor.clear()
            offset = { x: 0, y: 0 }
          }}
          on:undo={() => {
            commandsProcessor.undo()
          }}
          on:redo={() => {
            commandsProcessor.redo()
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
    background-color: var(--theme-drawing-bg-color);
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
