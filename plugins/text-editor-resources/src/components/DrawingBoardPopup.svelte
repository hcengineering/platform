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
  import textEditor from '@hcengineering/text-editor'
  import { Dialog, FocusHandler, createFocusManager } from '@hcengineering/ui'
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  import { Array as YArray, Map as YMap } from 'yjs'

  export let savedCmds: YArray<DrawingCmd>
  export let savedProps: YMap<any>
  export let fullSize = false

  const manager = createFocusManager()
  const dispatch = createEventDispatcher()

  let tool: DrawingTool = 'pen'
  let penColor = 'blue'
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
    if (fullSize) {
      dispatch('fullsize')
    }

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
  <FocusHandler {manager} />
  <Dialog
    isFullSize
    label={textEditor.string.DrawingBoard}
    padding="0"
    on:fullsize
    on:close={() => {
      dispatch('close')
    }}
  >
    <div
      style:position="relative"
      style:flex-grow="1"
      use:drawing={{
        readonly: false,
        autoSize: true,
        commandCount,
        commands,
        offset,
        tool,
        penColor,
        cmdAdded: (cmd) => {
          savedCmds.push([cmd])
        },
        panned: (offset) => {
          savedProps.set('offset', offset)
        }
      }}
    >
      <!-- grab focus from the editor -->
      <!-- svelte-ignore a11y-autofocus -->
      <input style:opacity="0" autoFocus />

      <DrawingBoardToolbar
        placeInside={true}
        showPanTool={true}
        bind:toolbar
        bind:tool
        bind:penColor
        on:clear={() => {
          savedCmds.delete(0, savedCmds.length)
          savedProps.set('offset', { x: 0, y: 0 })
        }}
      />
    </div>
  </Dialog>
{/if}
