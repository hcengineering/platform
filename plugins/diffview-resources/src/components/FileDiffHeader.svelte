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
  import { copyTextToClipboard } from '@hcengineering/presentation'
  import { Button, Chevron, IconCheck, IconCopy } from '@hcengineering/ui'
  import diffview, { DiffFile } from '@hcengineering/diffview'

  import { formatFileName, isDevNullName } from '../utils'

  export let file: DiffFile
  export let expanded = true
  export let viewed = false
  export let showViewed = true
  export let showExpand = true
  export let showChanges = true

  const dispatch = createEventDispatcher()

  async function copyFileNameToClipboard (): Promise<void> {
    const { oldName, newName } = file

    const name = isDevNullName(newName) ? newName : oldName
    await copyTextToClipboard(name)
  }
</script>

<div class="w-full flex-between">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="file-header-content flex-row-center h-8">
    {#if showExpand}
      <Button
        width="min-content"
        kind="ghost"
        padding={'0 .375rem'}
        noFocus
        on:click={() => {
          dispatch('expand')
        }}
      >
        <svelte:fragment slot="content">
          <Chevron size={'small'} {expanded} outline fill={'var(--caption-color)'} />
        </svelte:fragment>
      </Button>
    {/if}

    <div class="file-info overflow-label ml-1 mr-2">
      <span class="file-name">{formatFileName(file)}</span>
    </div>

    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="hover-trans" on:click={() => copyFileNameToClipboard()}>
      <IconCopy size={'small'} />
    </div>
  </div>

  <div class="file-header-actions flex-row-center flex-no-shrink h-8">
    {#if showChanges}
      <div class="file-stats flex pl-2 pr-2">
        <div class="lines-added flex">
          <span>+</span>
          <span>{file.stats.addedLines}</span>
        </div>
        <div class="lines-deleted flex">
          <span>+</span>
          <span>{file.stats.deletedLines}</span>
        </div>
      </div>
    {/if}

    {#if showViewed}
      <div class="mr-2">
        <Button
          icon={IconCheck}
          kind={'ghost'}
          showTooltip={{ label: diffview.string.Viewed }}
          highlight={viewed}
          noFocus
          on:click={() => {
            dispatch('viewed', !viewed)
          }}
        />
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .file-info {
    font-weight: 600;
    direction: rtl;
    text-align: left;
  }

  .file-stats {
    display: inline-flex;
    font-weight: 500;

    .lines-added {
      padding: 0 0.25rem;
      color: var(--theme-diffview-insert-color);
    }

    .lines-deleted {
      padding: 0 0.25rem;
      color: var(--theme-diffview-delete-color);
    }
  }
</style>
