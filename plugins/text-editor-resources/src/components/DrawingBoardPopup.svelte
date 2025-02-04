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
  import { DrawingCmd } from '@hcengineering/presentation'
  import textEditor from '@hcengineering/text-editor'
  import { Dialog } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { Array as YArray, Map as YMap } from 'yjs'
  import DrawingBoardEditor from './DrawingBoardEditor.svelte'

  export let boardId: string
  export let savedCmds: YArray<DrawingCmd>
  export let savedProps: YMap<any>
  export let readonly = false

  const dispatch = createEventDispatcher()

  let dialog: Dialog
  $: if (dialog !== undefined) {
    dialog.maximize()
  }
</script>

{#if savedCmds !== undefined && savedProps !== undefined}
  <Dialog
    label={textEditor.string.DrawingBoard}
    padding="0"
    bind:this={dialog}
    on:fullsize
    on:close={() => {
      dispatch('close')
    }}
  >
    <DrawingBoardEditor {boardId} {savedCmds} {savedProps} {readonly} grabFocus />
  </Dialog>
{/if}
