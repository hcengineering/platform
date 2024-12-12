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
  import {
    DrawingBoardToolbar,
    DrawingCmd,
    DrawingTool,
    DrawTextCmd,
    drawing,
    makeCommandId
  } from '@hcengineering/presentation'
  import { Loading } from '@hcengineering/ui'
  import { onMount, onDestroy } from 'svelte'
  import { Array as YArray, Map as YMap } from 'yjs'

  export let savedCmds: YArray<DrawingCmd>
  export let savedProps: YMap<any>
  export let grabFocus = false
  export let resizeable = false
  export let height: number | undefined = undefined
  export let readonly = false
  export let selected = false
  export let loading = false

  let tool: DrawingTool
  let penColor: string
  let penWidth: number
  let eraserWidth: number
  let fontSize: number
  let commands: DrawingCmd[] = []
  let offset: { x: number, y: number } = { x: 0, y: 0 }
  let changingCmdId: string | undefined
  let cmdEditor: HTMLDivElement | undefined
  let toolbar: HTMLDivElement
  let oldSelected = false
  let oldReadonly = false

  $: onSelectedChanged(selected)
  $: onReadonlyChanged(readonly)

  function listenSavedCommands (): void {
    commands = savedCmds.toArray()
  }

  function listenSavedProps (): void {
    // We have only local offset for now
    // A global offset should be implemented as a "Follow" feature
    // offset = savedProps.get('offset')
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

  onMount(() => {
    commands = savedCmds.toArray()
    // offset = savedProps.get('offset')
    savedCmds.observe(listenSavedCommands)
    savedProps.observe(listenSavedProps)
  })

  onDestroy(() => {
    savedCmds.unobserve(listenSavedCommands)
    savedProps.unobserve(listenSavedProps)
  })
</script>

{#if savedCmds !== undefined && savedProps !== undefined}
  {#if loading}
    <div
      class="board"
      class:selected
      style:flex-grow={resizeable ? undefined : '1'}
      style:height={resizeable ? `${height}px` : undefined}
    >
      <Loading />
      <slot />
    </div>
  {:else}
    <div
      class="board"
      class:selected
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
        panned: (newOffset) => {
          offset = newOffset
          // savedProps.set('offset', offset)
        },
        editorCreated: (editor) => {
          cmdEditor = editor
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
            // savedProps.set('offset', { x: 0, y: 0 })
          }}
        />
      {/if}
      <slot />
    </div>
  {/if}
{/if}

<style lang="scss">
  .board {
    position: relative;
    width: 100%;
    background-color: var(--theme-navpanel-color);
    border: 1px solid var(--theme-navpanel-border);
    border-radius: var(--small-BorderRadius);

    &.selected {
      border: 1px solid var(--theme-editbox-focus-border);
    }
  }
</style>
