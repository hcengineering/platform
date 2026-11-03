<!--
//
// Copyright © 2025 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
  import presentation, { Card } from '@hcengineering/presentation'
  import textEditor from '@hcengineering/text-editor'
  import { Button, Label } from '@hcengineering/ui'
  import view, { type TableMetadata } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'

  import type { TableConflictCell } from '../snapshot'
  import StructuredTableDiff from './StructuredTableDiff.svelte'
  import TableSourceInfo from './TableSourceInfo.svelte'
  import type { TableDiffSide } from './tableDiff'

  export let current: TableDiffSide
  export let fresh: TableDiffSide
  export let metadata: TableMetadata
  /** Replaces the table; when it cannot, the reason is shown separately. */
  export let onApply: () => void = () => {}
  export let localChanges = false
  export let conflicts = false
  export let conflictCells: TableConflictCell[] = []

  const dispatch = createEventDispatcher()

  // The card closes either way: when the table changed meanwhile, the preview is stale.
  function handleApply (): void {
    onApply()
  }

  function handleCancel (): void {
    dispatch('close')
  }
</script>

<Card
  label={textEditor.string.TableRefreshConfirmationLabel}
  okLabel={localChanges || conflicts ? view.string.TableReplace : textEditor.string.RefreshTable}
  fullSize={true}
  canSave={true}
  okAction={handleApply}
  onCancel={handleCancel}
  on:close={handleCancel}
>
  {#if conflicts || localChanges}
    <div class="notice" class:conflict={conflicts}>
      <Label label={conflicts ? view.string.TableConflicts : view.string.LocalTableChanges} />
    </div>
  {/if}
  <div class="table-diff-container">
    <StructuredTableDiff oldTable={current} newTable={fresh} {conflictCells} />
  </div>
  <TableSourceInfo {metadata} />
  <svelte:fragment slot="buttons">
    <Button label={presentation.string.Cancel} kind="secondary" size="large" on:click={handleCancel} />
  </svelte:fragment>
</Card>

<style lang="scss">
  .notice {
    margin: 0 1rem 0.75rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--theme-divider-color);
    border-left: 3px solid var(--theme-divider-color);
    border-radius: 0.25rem;
    color: var(--theme-content-color);

    &.conflict {
      border-left-color: var(--theme-warning-color);
    }
  }
  .table-diff-container {
    padding: 0rem 1rem;
    overflow: auto;
    max-height: 80vh;
  }
</style>
