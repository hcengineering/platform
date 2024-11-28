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
  import { ActionContext, DrawingCmd, DrawingTool, drawing } from '@hcengineering/presentation'
  import textEditor from '@hcengineering/text-editor'
  import { Dialog } from '@hcengineering/ui'
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  import { Array as YArray, Doc as YDoc } from 'yjs'

  export let id: string
  export let ydoc: YDoc
  export let fullSize = false

  const dispatch = createEventDispatcher()

  const drawingTool: DrawingTool = 'pen'
  const penColor = 'blue'
  let commandCount: number
  let drawingCmds: DrawingCmd[] = []
  let savedCmds: YArray<DrawingCmd>

  function listenSavedCommands (): void {
    if (savedCmds.length === 0) {
      drawingCmds = []
    } else {
      for (let i = drawingCmds.length; i < savedCmds.length; i++) {
        drawingCmds.push(savedCmds.get(i))
      }
    }
    commandCount = savedCmds.length
  }

  onMount(() => {
    if (fullSize) {
      dispatch('fullsize')
    }

    savedCmds = ydoc.getMap(`drawing-board-${id}`).get('commands') as YArray<DrawingCmd>
    if (savedCmds !== undefined) {
      drawingCmds = savedCmds.toArray()
      savedCmds.observe(listenSavedCommands)
    }
  })

  onDestroy(() => {
    if (savedCmds !== undefined) {
      savedCmds.unobserve(listenSavedCommands)
    }
  })
</script>

{#if savedCmds !== undefined}
  <ActionContext context={{ mode: 'browser' }} />
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
        drawingCmds,
        drawingTool,
        penColor,
        cmdAdded: (cmd) => {
          savedCmds.push([cmd])
        }
      }}
    />
  </Dialog>
{/if}
