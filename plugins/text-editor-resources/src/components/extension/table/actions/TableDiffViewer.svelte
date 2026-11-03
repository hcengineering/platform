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
  import { Label } from '@hcengineering/ui'
  import view, { type TableMetadata } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'

  import StructuredTableDiff from './StructuredTableDiff.svelte'
  import TableSourceInfo from './TableSourceInfo.svelte'
  import type { TableDiffSide } from './tableDiff'

  /** The table as it is in the document now. */
  export let current: TableDiffSide
  /** The table as the source would render it now. */
  export let fresh: TableDiffSide
  export let metadata: TableMetadata

  const dispatch = createEventDispatcher()

  function handleClose (): void {
    dispatch('close')
  }
</script>

<Card
  label={textEditor.string.TableDiffLabel}
  fullSize={true}
  canSave={true}
  okLabel={presentation.string.Ok}
  okAction={handleClose}
  onCancel={handleClose}
  on:close={handleClose}
>
  <div class="caption text-md content-dark-color"><Label label={view.string.TableDiffCaption} /></div>
  <div class="table-diff-container">
    <StructuredTableDiff oldTable={current} newTable={fresh} />
  </div>
  <TableSourceInfo {metadata} />
</Card>

<style>
  .caption {
    padding: 0 1rem 0.75rem;
  }
  .table-diff-container {
    padding: 0rem 1rem;
    overflow: auto;
    max-height: 80vh;
  }
</style>
