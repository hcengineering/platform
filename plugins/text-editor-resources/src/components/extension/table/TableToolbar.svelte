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
  import { createQuery } from '@hcengineering/presentation'
  import TextActionButton from '../../TextActionButton.svelte'
  import { getResource } from '@hcengineering/platform'

  export let editor: NodeViewProps['editor']

  const actionsQuery = createQuery()
  const actionCtx: ActionContext = {
    mode: 'full',
    tag: 'table-toolbar'
  }

  let actions: TextEditorAction[] = []

  async function updateActions (newActions: TextEditorAction[], ctx: ActionContext): Promise<void> {
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

  $: actionsQuery.query(textEditor.class.TextEditorAction, { category: 70 }, (result) => {
    void updateActions([...result], actionCtx)
  })
</script>

<div class="table-toolbar flex" contenteditable="false">
  {#each actions as action}
    <TextActionButton {action} {editor} size="small" {actionCtx} blockMouseEvents={false} />
  {/each}
</div>

<style lang="scss">
  .table-toolbar {
    padding: 0.25rem;
    background-color: var(--theme-comp-header-color);
    border-radius: 0.5rem;
    box-shadow: var(--button-shadow);
  }
</style>
