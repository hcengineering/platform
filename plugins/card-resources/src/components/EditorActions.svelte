<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { ButtonIcon, handler } from '@hcengineering/ui'
  import type { RefAction, TextEditorHandler } from '@hcengineering/text-editor'
  import { getEditorHandler } from '@hcengineering/text-editor-resources/src/components/editor-context'

  export let actions: RefAction[] = []

  const editorHandler: TextEditorHandler | undefined = getEditorHandler()

  $: sortedActions = actions.slice().sort((a, b) => a.order - b.order)

  function handleAction (action: RefAction, evt?: Event): void {
    if (editorHandler === undefined) {
      console.error('Editor handler is not available')
      return
    }
    action.action(evt?.target as HTMLElement, editorHandler)
  }
</script>

<div class="editor-actions">
  {#each sortedActions as action}
    <ButtonIcon
      disabled={action.disabled}
      icon={action.icon}
      iconSize="small"
      size="small"
      kind="tertiary"
      tooltip={{ label: action.label }}
      on:click={handler(action, (a, evt) => {
        if (a.disabled !== true) {
          handleAction(a, evt)
        }
      })}
    />
  {/each}
</div>

<style lang="scss">
  .editor-actions {
    display: flex;
    gap: 0.375rem;
  }
</style>
