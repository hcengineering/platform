<!--
// Copyright © 2022, 2023, 2024 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { type Editor } from '@tiptap/core'
  import { type TextEditorAction, type ActionContext } from '@hcengineering/text-editor'
  import { getResource } from '@hcengineering/platform'
  import { Icon, IconSize, tooltip } from '@hcengineering/ui'

  export let action: TextEditorAction
  export let size: IconSize
  export let editor: Editor
  export let actionCtx: ActionContext
  export let blockMouseEvents = true

  const dispatch = createEventDispatcher()
  let selected: boolean = false
  $: void updateSelected(editor, action)

  async function updateSelected (e: Editor, { isActive }: TextEditorAction): Promise<void> {
    if (isActive === undefined) {
      selected = false
      return
    }

    if (typeof isActive === 'string') {
      const isActiveFunc = await getResource(isActive)
      selected = await isActiveFunc(e)
    } else {
      const { name, params } = isActive
      selected = editor.isActive(name, params)
    }
  }

  async function handleClick (event: MouseEvent): Promise<void> {
    if (blockMouseEvents) {
      event.preventDefault()
      event.stopPropagation()
    }

    const handler = action.action

    if (typeof handler === 'string') {
      const actionFunc = await getResource(handler)
      await actionFunc(editor, event, actionCtx)
    } else {
      const { command, params } = handler

      const cmd = (editor.commands as any)[command]
      if (cmd) {
        cmd(params)
      }
    }
    dispatch('focus')
  }
</script>

<button
  class="button {size}"
  class:selected
  use:tooltip={{ label: action.label }}
  tabindex="0"
  data-id={'btn' + action.label.split(':').pop()}
  on:click={handleClick}
>
  <Icon icon={action.icon} {size} />
</button>

<style lang="scss">
  .button {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.75rem;
    color: var(--theme-darker-color);
    border-radius: 0.25rem;
    cursor: pointer;

    &:hover {
      color: var(--theme-content-color);
    }
    &:focus {
      color: var(--theme-caption-color);
      box-shadow: 0 0 0 2px var(--primary-button-outline);
    }
    &.selected {
      background-color: var(--theme-button-pressed);
      border-color: var(--theme-button-border);
      color: var(--theme-caption-color);
    }
    &.small {
      width: 1rem;
      height: 1rem;
    }
    &.medium {
      width: 1.25rem;
      height: 1.25rem;
    }
    &.large {
      width: 1.5rem;
      height: 1.5rem;
    }

    &.disabled {
      opacity: 0.5;

      &:hover {
        color: var(--theme-darker-color);
        cursor: default;
      }
    }
  }
</style>
