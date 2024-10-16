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
  import { createEventDispatcher } from 'svelte'
  import { createFocusManager, FocusHandler, ListView, Label, languageStore } from '@hcengineering/ui'
  import { TextEditorInlineCommand } from '@hcengineering/text-editor'
  import { Ref } from '@hcengineering/core'
  import presentation from '@hcengineering/presentation'
  import { translate } from '@hcengineering/platform'

  import InlineCommandPresenter from './InlineCommandPresenter.svelte'
  import { DisplayInlineCommand } from '../types'

  export let query: string = ''
  export let commands: TextEditorInlineCommand[]
  export let onSelect: ((value: Ref<TextEditorInlineCommand>, event?: Event) => void) | undefined = undefined

  const dispatch = createEventDispatcher()
  const manager = createFocusManager()

  let list: ListView
  let selection = 0

  let displayCommands: DisplayInlineCommand[] = []

  $: void updateDisplayItems(commands, $languageStore)

  $: filteredCommands =
    query === ''
      ? displayCommands
      : displayCommands.filter(
        (it) =>
          it.command.toLowerCase().includes(query.toLowerCase()) ||
            it.title.toLowerCase().includes(query.toLowerCase()) ||
            (it.description !== undefined && it.description.toLowerCase().includes(query.toLowerCase()))
      )

  async function updateDisplayItems (commands: TextEditorInlineCommand[], lang: string): Promise<void> {
    const result: DisplayInlineCommand[] = []

    for (const command of commands) {
      result.push({
        _id: command._id,
        icon: command.icon,
        title: await translate(command.title, {}, lang),
        description: command.description ? await translate(command.description, {}, lang) : undefined,

        command: command.command,
        commandTemplate: command.commandTemplate,
        type: command.type
      })
    }
    displayCommands = result
  }

  function handleSelect (_id: Ref<TextEditorInlineCommand>): void {
    if (onSelect) {
      onSelect(_id)
    } else {
      dispatch('close', _id)
    }
  }

  export function onKeydown (key: KeyboardEvent): boolean {
    if (key.code === 'Tab') {
      dispatch('close')
      key.preventDefault()
      key.stopPropagation()
      return true
    }
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection - 1)
      return true
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection + 1)
      return true
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      handleSelect(commands[selection]._id)
      return true
    }
    return false
  }
</script>

<FocusHandler {manager} />

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="selectPopup" tabindex="0" on:keydown={onKeydown}>
  <div class="menu-space" />
  <div class="scroll">
    <div class="box">
      {#if filteredCommands.length === 0}
        <div class="noResults"><Label label={presentation.string.NoResults} /></div>
      {:else}
        <ListView bind:this={list} bind:selection count={filteredCommands.length}>
          <svelte:fragment slot="item" let:item={itemId}>
            {@const item = filteredCommands[itemId]}
            <button
              class="menu-item withList w-full"
              on:click={() => {
                handleSelect(item._id)
              }}
            >
              <div class="flex-row-center flex-grow pointer-events-none">
                <InlineCommandPresenter value={item} />
              </div>
            </button>
          </svelte:fragment>
        </ListView>
      {/if}
    </div>
  </div>
  <div class="menu-space" />
</div>

<style lang="scss">
  .noResults {
    display: flex;
    padding: 0.25rem 1rem;
    align-items: center;
    align-self: stretch;
    justify-content: center;
  }
</style>
