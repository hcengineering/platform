<!--
//
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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
  import { NodeViewProps } from '../../node-view'
  import textEditor, { ActionContext, TextEditorAction } from '@hcengineering/text-editor'
  import { ObjectNode, createQuery } from '@hcengineering/presentation'
  import TextActionButton from '../../TextActionButton.svelte'
  import { getResource } from '@hcengineering/platform'
  import { onDestroy } from 'svelte'
  import { Transaction } from '@tiptap/pm/state'
  import { EmbedControlCursor, shouldShowLink } from './embed'
  import { parseReferenceUrl } from '../reference'

  export let editor: NodeViewProps['editor']
  export let cursor: EmbedControlCursor | null = null

  const actionsQuery = createQuery()
  const actionCtx: ActionContext = {
    mode: 'full',
    tag: 'embed-toolbar'
  }

  let allActions: TextEditorAction[] = []
  let actions: TextEditorAction[] = []

  async function updateActions (newActions: TextEditorAction[], ctx: ActionContext): Promise<void> {
    allActions = newActions
    const out: TextEditorAction[] = []
    for (const action of newActions) {
      const tester = action.visibilityTester

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

  const listener = ({ transaction }: { transaction: Transaction }) => {
    if (transaction.getMeta('contextCursorUpdate') === true) {
      actions = []
      void updateActions(allActions, actionCtx)
    }
  }

  if (editor !== undefined) {
    editor.on('transaction', listener)
    onDestroy(() => {
      editor.off('transaction', listener)
    })
  }

  actionsQuery.query(textEditor.class.TextEditorAction, { kind: 'preview' }, (result) => {
    void updateActions([...result], actionCtx)
  })

  $: categories = actions.reduce<[number, TextEditorAction][][]>((acc, action) => {
    const { category, index } = action
    if (acc[category] === undefined) acc[category] = []
    acc[category].push([index, action])
    return acc
  }, [])

  $: categories.forEach((category) => {
    category.sort((a, b) => a[0] - b[0])
  })

  $: showSrc = shouldShowLink(cursor)
  $: reference = cursor?.src !== undefined ? parseReferenceUrl(cursor.src) : undefined
</script>

{#if cursor && actions.length > 0}
  <div
    class="embed-toolbar flex theme-dark"
    class:reference={showSrc && !!reference}
    contenteditable="false"
    tabindex="-1"
    data-block-editor-blur="true"
  >
    <div class="text-editor-toolbar buttons-group xsmall-gap">
      {#if showSrc}
        {#if !reference}
          <a class="link" href={cursor.src} target="_blank">{cursor.src}</a>
        {/if}
        {#if reference}
          <ObjectNode _id={reference.id} _class={reference.objectclass} title={reference.label} transparent />
        {/if}
        {#if reference}
          <div class="buttons-divider" />
        {/if}
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
            blockMouseEvents={false}
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

  .embed-toolbar {
    position: relative;
    padding: 0.25rem;
    background-color: var(--primary-button-default);
    border-radius: 0.5rem;
    box-shadow: var(--button-shadow);

    --theme-link-color: var(--theme-content-color);
  }
</style>
