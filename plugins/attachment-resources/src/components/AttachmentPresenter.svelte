<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Attachment } from '@anticrm/attachment'
  import { showPopup, closeTooltip } from '@anticrm/ui'
  import { PDFViewer, getFileUrl } from '@anticrm/presentation'
  import filesize from 'filesize'
  import { extensionIconLabel, isEmbedded, trimFilename } from '../utils'

  export let value: Attachment

  const maxLenght: number = 16
</script>

<div class="flex-row-center">
  {#if isEmbedded(value.type)}
    <div
      class="flex-center icon"
      on:click={() => {
        closeTooltip()
        showPopup(PDFViewer, { file: value.file, name: value.name, contentType: value.type }, 'right')
      }}
    >
      {extensionIconLabel(value.name)}
    </div>
  {:else}
    <a class="no-line" href={getFileUrl(value.file)} download={value.name}
      ><div class="flex-center icon">{extensionIconLabel(value.name)}</div></a
    >
  {/if}
  <div class="flex-col info">
    {#if isEmbedded(value.type)}
      <div
        class="name"
        on:click={() => {
          closeTooltip()
          showPopup(PDFViewer, { file: value.file, name: value.name, contentType: value.type }, 'right')
        }}
      >
        {trimFilename(value.name, maxLenght)}
      </div>
    {:else}
      <div class="name">
        <a href={getFileUrl(value.file)} download={value.name}>{trimFilename(value.name, maxLenght)}</a>
      </div>
    {/if}
    <div class="type">{filesize(value.size)}</div>
  </div>
</div>

<style lang="scss">
  .icon {
    flex-shrink: 0;
    margin-right: 1rem;
    width: 2rem;
    height: 2rem;
    font-weight: 500;
    font-size: 0.625rem;
    color: var(--primary-button-color);
    background-color: var(--primary-button-enabled);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.5rem;
    cursor: pointer;
  }

  .name {
    font-weight: 500;
    color: var(--theme-content-accent-color);
    white-space: nowrap;
    cursor: pointer;
  }

  .type {
    font-size: 0.75rem;
    color: var(--theme-content-dark-color);
  }

  .name:hover,
  .icon:hover + .info > .name,
  .no-line:hover + .info > .name a {
    text-decoration: underline;
    color: var(--theme-caption-color);
  }
  .name:active,
  .icon:active + .info > .name,
  .no-line:active + .info > .name a {
    text-decoration: underline;
    color: var(--theme-content-accent-color);
  }
</style>
