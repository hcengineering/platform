<!--
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
-->

<script lang="ts">
  import { getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import { humanReadableFileSize, Label, ProgressCircle, Scroller, tooltip } from '@hcengineering/ui'

  import IconCompleted from './icons/Completed.svelte'

  import plugin from '../plugin'
  import { downloads } from '../store'
  import { DownloadItemState } from '@hcengineering/desktop-downloads'

  const labels: Record<DownloadItemState, IntlString> = {
    completed: plugin.string.Completed,
    cancelled: plugin.string.Cancelled,
    interrupted: plugin.string.Interrupted,
    paused: plugin.string.Paused,
    progressing: plugin.string.Progressing
  }
</script>

<div class="antiPopup upload-popup">
  <div class="upload-popup__header flex-row-center flex-gap-1">
    <div class="label overflow-label font-medium-14">
      <Label label={plugin.string.Downloads} />
    </div>
  </div>

  <Scroller>
    <div class="upload-popup__content flex-col flex-no-shrink flex-gap-4">
      {#each $downloads as item}
        {@const progress = item.totalBytes > 0 ? Math.ceil((item.receivedBytes / item.totalBytes) * 100) : 0}
        <div class="upload-file-row flex-row-center justify-start flex-gap-4">
          <div class="upload-file-row__status w-4">
            {#if item.state === 'completed'}
              <IconCompleted size={'small'} fill={'var(--positive-button-default)'} />
            {:else}
              <ProgressCircle value={progress} size={'small'} primary />
            {/if}
          </div>

          <div class="upload-file-row__content flex-col flex-gap-1">
            <div class="label overflow-label font-medium-14" use:tooltip={{ label: getEmbeddedLabel(item.fileName) }}>
              {item.fileName}
            </div>
            <div class="flex-row-center flex-gap-2 text-sm">
              <span>{humanReadableFileSize(item.receivedBytes)}</span>
              {#if item.totalBytes > 0 && item.totalBytes !== item.receivedBytes}
                <span>/</span>
                <span>{humanReadableFileSize(item.totalBytes)}</span>
              {/if}
              <span>•</span>

              <Label label={labels[item.state]} />
            </div>
          </div>
        </div>
      {/each}
    </div>
  </Scroller>
</div>

<style lang="scss">
  .upload-popup {
    padding: var(--spacing-2);
    max-height: 30rem;

    .upload-popup__header {
      padding-bottom: 1rem;
      margin-left: 0.5rem;
      margin-right: 0.625rem;
    }

    .upload-popup__content {
      margin: 0.5rem;
      margin-right: 0.625rem;
    }
  }

  .upload-file-row {
    .upload-file-row__content {
      flex-grow: 2;
    }

    .upload-file-row__tools {
      flex-shrink: 0;
    }
  }
</style>
