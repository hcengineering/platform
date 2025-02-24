<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Label } from '@hcengineering/ui'
  import { Diff, DiffFile, DiffFileId, DiffViewMode } from '@hcengineering/diffview'
  import DiffViewModeDropdown from './DiffViewModeDropdown.svelte'
  import FileDiffView from './FileDiffView.svelte'
  import { parseDiff } from '../parser'
  import diffview from '../plugin'

  export let patch: Diff
  export let viewed: DiffFileId[]

  let mode: DiffViewMode = getCurrentMode()

  function getCurrentMode (): DiffViewMode {
    return (localStorage.getItem('diffview.mode') as DiffViewMode) ?? 'unified'
  }

  function saveMode (value: DiffViewMode) {
    localStorage.setItem('diffview.mode', value)
    mode = value
  }

  function isFileViewed (diffFile: DiffFile): boolean {
    const { fileName, sha } = diffFile

    return viewed.some((file) => file.fileName === fileName && file.sha === sha)
  }

  $: diffFiles = parseDiff(patch ?? '')
</script>

<div class="flex-row-center justify-end gap-2 mb-1">
  <span class="overflow-label"><Label label={diffview.string.ViewMode} /></span>
  <DiffViewModeDropdown
    kind={'regular'}
    size={'medium'}
    label={diffview.string.ViewMode}
    bind:selected={mode}
    on:selected={({ detail }) => {
      saveMode(detail)
    }}
  />
</div>

{#each diffFiles as diffFile}
  {@const fileViewed = isFileViewed(diffFile)}
  <FileDiffView file={diffFile} viewed={fileViewed} {mode} on:change />
{/each}
