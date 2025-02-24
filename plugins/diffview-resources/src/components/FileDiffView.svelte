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
  import { createEventDispatcher } from 'svelte'
  import { IntlString } from '@hcengineering/platform'
  import { Button, Label } from '@hcengineering/ui'
  import { DiffFile, DiffViewMode } from '@hcengineering/diffview'

  import FileDiffContent from './FileDiffContent.svelte'
  import FileDiffHeader from './FileDiffHeader.svelte'

  import diffview from '../plugin'

  export let file: DiffFile
  export let mode: DiffViewMode
  export let viewed = false
  export let showViewed = true
  export let showExpand = true
  export let showChanges = true
  export let tabSize = 4

  export let diffRenderLimit = 200

  const dispatch = createEventDispatcher()

  let expanded = !viewed

  let hideDiffLabel = getHideDiffLabel(file)

  function getHideDiffLabel (file: DiffFile): IntlString | undefined {
    if (diffRenderLimit >= 0 && file.stats.addedLines + file.stats.addedLines > diffRenderLimit) {
      return diffview.string.LargeDiffsAreHidden
    }
    if (file.diffType === 'delete') {
      return diffview.string.FileWasDeleted
    }
  }

  function getNoChangesLabel (file: DiffFile): IntlString {
    if (file.hunks.length === 0) {
      if (file.isTooBig === true) {
        return diffview.string.FileIsTooLarge
      }
      if (file.diffType === 'rename') {
        return diffview.string.FileWasRenamed
      }
    }
    return diffview.string.NoChanges
  }

  function showDiff (): void {
    hideDiffLabel = undefined
  }
</script>

<div class="diff-file">
  <!-- Header -->
  <div class="file-header sticky-file-header flex-between" class:expanded>
    <FileDiffHeader
      {file}
      {expanded}
      {viewed}
      {showViewed}
      {showExpand}
      {showChanges}
      on:expand={() => {
        expanded = !expanded
        dispatch('expanded', expanded)
      }}
      on:viewed={(evt) => {
        viewed = evt.detail
        expanded = !viewed
        dispatch('change', { fileName: file.fileName, sha: file.sha, viewed })
      }}
    />
  </div>

  <!-- Content -->
  {#if expanded}
    <div class="file-content w-full">
      {#if file.hunks.length === 0}
        {@const label = getNoChangesLabel(file)}
        <div class="p-2">
          <span class="overflow-label"><Label {label} /></span>
        </div>
      {/if}
      {#if hideDiffLabel}
        <div class="pt-6 pb-6 flex-col-center">
          <Button
            label={diffview.string.ShowDiff}
            kind={'link'}
            accent
            noFocus
            on:click={() => {
              showDiff()
            }}
            size={'small'}
          />
          <span class="overflow-label"><Label label={hideDiffLabel} /></span>
        </div>
      {:else}
        <FileDiffContent {file} {mode} {tabSize} />
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .diff-file {
    margin-bottom: 1rem;
  }

  .file-header {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.25rem;
    background-color: var(--theme-comp-header-color);
    overflow-y: hidden;

    &.expanded {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }
  }

  .sticky-file-header {
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .file-content {
    border: 1px solid var(--theme-divider-color);
    border-top: 0;
    border-bottom-left-radius: 0.25rem;
    border-bottom-right-radius: 0.25rem;
    overflow-y: hidden;
  }
</style>
