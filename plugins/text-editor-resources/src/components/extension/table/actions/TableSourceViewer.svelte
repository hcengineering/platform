<!--
//
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
  import { markdownToMarkup } from '@hcengineering/text-markdown'
  import type { TableMetadata } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import MarkupDiffViewer from '../../../MarkupDiffViewer.svelte'
  import TableSourceInfo from './TableSourceInfo.svelte'

  export let markdown: string
  export let metadata: TableMetadata
  const dispatch = createEventDispatcher()
</script>

<Card
  label={textEditor.string.SeeOriginalData}
  fullSize
  canSave
  okLabel={presentation.string.Ok}
  okAction={() => {
    dispatch('close')
  }}
  on:close={() => dispatch('close')}
>
  <MarkupDiffViewer content={markdownToMarkup(markdown)} />
  <TableSourceInfo {metadata} />
</Card>
