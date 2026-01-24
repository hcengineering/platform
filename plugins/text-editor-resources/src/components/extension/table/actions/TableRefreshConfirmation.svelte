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
// See the License for the specific language governing permissions and
// limitations under the License.
//
-->
<script lang="ts">
  import { markdownToMarkup } from '@hcengineering/text-markdown'
  import presentation, { Card } from '@hcengineering/presentation'
  import textEditor from '@hcengineering/text-editor'
  import { Button } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import type { TableMetadata } from '../tableMetadata'

  import MarkupDiffViewer from '../../../MarkupDiffViewer.svelte'
  import TableSourceInfo from './TableSourceInfo.svelte'

  export let oldMarkdown: string
  export let newMarkdown: string
  export let metadata: TableMetadata
  export let onApply: () => void = () => {}

  const dispatch = createEventDispatcher()

  // Convert markdown strings to MarkupNode for structured diffing
  $: oldContent = markdownToMarkup(oldMarkdown)
  $: newContent = markdownToMarkup(newMarkdown)

  function handleApply (): void {
    onApply()
    dispatch('close')
  }

  function handleCancel (): void {
    dispatch('close')
  }
</script>

<Card
  label={textEditor.string.TableRefreshConfirmationLabel}
  fullSize={true}
  canSave={true}
  okAction={handleApply}
  onCancel={handleCancel}
  on:close={handleCancel}
>
  <div class="table-diff-container">
    <MarkupDiffViewer content={newContent} comparedVersion={oldContent} />
  </div>
  <TableSourceInfo {metadata} />
  <svelte:fragment slot="buttons">
    <Button label={presentation.string.Cancel} kind="secondary" size="large" on:click={handleCancel} />
  </svelte:fragment>
</Card>

<style>
  .table-diff-container {
    padding: 0rem 1rem;
    overflow: auto;
    max-height: 80vh;
  }
</style>
