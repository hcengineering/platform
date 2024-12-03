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
  import { DrawingBoardToolbar, DrawingCmd, DrawingTool, drawing } from '@hcengineering/presentation'
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
  let commandCount: number
  let commands: DrawingCmd[] = []
  let offset: { x: number, y: number }
  let toolbar: HTMLDivElement

  function listenSavedCommands (): void {
    if (savedCmds.length === 0) {
      commands = []
    } else {
      for (let i = commands.length; i < savedCmds.length; i++) {
        commands.push(savedCmds.get(i))
      }
    }
    commandCount = savedCmds.length
  }

  function listenSavedProps (): void {
    offset = savedProps.get('offset')
  }

  onMount(() => {
    commands = savedCmds.toArray()
    offset = savedProps.get('offset')
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
        commandCount,
        commands,
        offset,
        tool,
        penColor,
        penWidth,
        eraserWidth,
        cmdAdded: (cmd) => {
          savedCmds.push([cmd])
        },
        panned: (offset) => {
          savedProps.set('offset', offset)
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
          bind:toolbar
          bind:tool
          bind:penColor
          bind:penWidth
          bind:eraserWidth
          on:clear={() => {
            savedCmds.delete(0, savedCmds.length)
            savedProps.set('offset', { x: 0, y: 0 })
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
