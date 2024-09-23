<!--
// Copyright © 2020 Anticrm Platform Contributors.
// Copyright © 2021, 2022, 2023, 2024 Hardcore Engineering Inc.
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
  import { IconSize } from '@hcengineering/ui'
  import { Editor } from '@tiptap/core'
  import textEditor, {
    type TextEditorAction,
    type ActionContext,
    type TextEditorActionKind
  } from '@hcengineering/text-editor'
  import { createQuery } from '@hcengineering/presentation'
  import { getResource } from '@hcengineering/platform'
  import { onDestroy, onMount } from 'svelte'

  import { inlineToolbarKey } from './extension/inlineToolbar'
  import TextActionButton from './TextActionButton.svelte'

  export let formatButtonSize: IconSize = 'small'
  export let editor: Editor
  export let toolbar: HTMLElement | null
  export let visible: boolean = true
  export let kind: TextEditorActionKind = 'text'

  const actionsQuery = createQuery()

  $: actionCtx = editor?.extensionManager.extensions.find((ext) => ext.name === inlineToolbarKey)?.options.ctx

  let actions: TextEditorAction[]
  $: actionsQuery.query(textEditor.class.TextEditorAction, {}, (result) => {
    actions = result.filter((action) => action.kind === kind || (kind === 'text' && action.kind === undefined))
  })

  let visibleActions: TextEditorAction[]
  $: void getVisibleActions(editor, actions, actionCtx)

  async function getVisibleActions (
    e: Editor | undefined,
    actions: TextEditorAction[],
    ctx: ActionContext
  ): Promise<void> {
    const newVisibleActions = []
    if (e !== undefined && actions !== undefined) {
      for (const action of actions) {
        const tester = action.visibilityTester

        if (typeof action.action !== 'string') {
          const { command } = action.action

          if ((editor.commands as any)[command] === undefined) {
            console.error(`Command ${command} not found`)
            continue
          }
        }

        if (tester === undefined) {
          newVisibleActions.push(action)
          continue
        }

        const testerFunc = await getResource(tester)
        if (await testerFunc(e, ctx)) {
          newVisibleActions.push(action)
        }
      }
    }

    visibleActions = newVisibleActions
  }

  $: categories = visibleActions.reduce<[number, TextEditorAction][][]>((acc, action) => {
    const { category, index } = action

    if (acc[category] === undefined) {
      acc[category] = []
    }

    acc[category].push([index, action])

    return acc
  }, [])
  $: categories.forEach((category) => {
    category.sort((a, b) => a[0] - b[0])
  })

  let selecting = false

  function handleMouseDown (): void {
    function handleMouseMove (): void {
      if (!editor.state.selection.empty) {
        selecting = true
        document.removeEventListener('mousemove', handleMouseMove)
      }
    }

    function handleMouseUp (): void {
      selecting = false

      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  onMount(() => {
    document.addEventListener('mousedown', handleMouseDown)
  })

  onDestroy(() => {
    document.removeEventListener('mousedown', handleMouseDown)
  })
</script>

<div bind:this={toolbar} class="p-2" style="visibility: hidden;">
  {#if editor && visible && !selecting && visibleActions.length > 0}
    <div class="text-editor-toolbar buttons-group xsmall-gap">
      {#each Object.values(categories) as category, index}
        {#if index > 0}
          <div class="buttons-divider" />
        {/if}

        {#each category as [_, action]}
          <TextActionButton {action} {editor} size={formatButtonSize} {actionCtx} on:focus />
        {/each}
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .text-editor-toolbar {
    padding: 0.25rem;
    background-color: var(--theme-comp-header-color);
    border-radius: 0.5rem;
    box-shadow: var(--button-shadow);
    z-index: 1;
  }
</style>
