<!--
//
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
//
-->
<script lang="ts">
  import { getResource } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import textEditor, { ActionContext, TextEditorAction } from '@hcengineering/text-editor'
  import { NodeViewProps } from '../../node-view'
  import TextActionButton from '../../TextActionButton.svelte'
  import { type ToolbarCursor } from './toolbar'
  import { Component } from '@hcengineering/ui'

  export let editor: NodeViewProps['editor']
  export let cursor: ToolbarCursor<any> | null = null
  export let context: ActionContext

  $: actionCtx = { ...context, tag: cursor?.tag ?? 'none' }
  const actionsQuery = createQuery()

  let allActions: TextEditorAction[] = []
  let actions: TextEditorAction[] = []

  async function updateActions (newActions: TextEditorAction[], ctx: ActionContext): Promise<void> {
    const out: TextEditorAction[] = []
    for (const action of newActions) {
      const tester = action.visibilityTester

      if (!(action.tags ?? ['text']).includes(ctx.tag ?? 'text')) {
        continue
      }

      if (tester === undefined) {
        out.push(action)
        continue
      }

      const testerFunc = await getResource(tester)
      if (await testerFunc(editor, ctx)) {
        out.push(action)
      }
    }

    actions = out
  }

  actionsQuery.query(textEditor.class.TextEditorAction, {}, (result) => {
    allActions = [...result]
  })

  $: void updateActions(allActions, actionCtx)

  $: categories = actions.reduce<[number, TextEditorAction][][]>((acc, action) => {
    const { category, index } = action
    if (acc[category] === undefined) acc[category] = []
    acc[category].push([index, action])
    return acc
  }, [])

  $: categories.forEach((category) => {
    category.sort((a, b) => a[0] - b[0])
  })

  $: style = cursor?.viewOptions?.style ?? 'contrast'

  $: head = cursor?.viewOptions?.head
</script>

{#if cursor && actions.length > 0}
  <div
    class="toolbar flex theme-dark"
    contenteditable="false"
    class:theme-dark={style === 'contrast'}
    class:toolbar-contrast={style === 'contrast'}
    class:toolbar-regular={style === 'regular'}
    data-block-editor-blur="true"
  >
    <div class="text-editor-toolbar buttons-group xsmall-gap">
      {#if head}
        <Component is={head.component} props={{ editor, cursor, ...head.props }} />
      {/if}
      {#each Object.values(categories) as category, index}
        {#if index > 0}
          <div class="buttons-divider" />
        {/if}

        {#each category as [_, action]}
          <TextActionButton
            {action}
            {editor}
            size="small"
            {actionCtx}
            listenCursorUpdate
            blockMouseEvents={true}
            tooltipOptions={{ direction: 'top' }}
          />
        {/each}
      {/each}
    </div>
  </div>
{/if}

<style lang="scss">
  .link {
    padding: 0 0.5rem;
    padding-right: 0;
    max-width: 20rem;
    font-weight: 400;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--theme-link-color);

    &:hover {
      color: var(--theme-link-color);
    }
  }

  .toolbar {
    position: relative;
    padding: 0.25rem;
    border-radius: 0.5rem;

    &.toolbar-contrast {
      background-color: var(--primary-button-default);
      --theme-link-color: var(--theme-content-color);
      box-shadow: var(--button-shadow);
    }

    &.toolbar-regular {
      background-color: var(--theme-comp-header-color);
      --theme-link-color: var(--theme-content-color);
      box-shadow: var(--button-shadow);
    }
  }
</style>
