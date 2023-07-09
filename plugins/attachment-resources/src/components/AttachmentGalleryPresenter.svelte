<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import type { Attachment } from '@hcengineering/attachment'
  import { showPopup, closeTooltip } from '@hcengineering/ui'
  import { PDFViewer, getFileUrl } from '@hcengineering/presentation'
  import filesize from 'filesize'

  export let value: Attachment

  const maxLength: number = 18
  const trimFilename = (fname: string): string =>
    fname.length > maxLength ? fname.substr(0, (maxLength - 1) / 2) + '...' + fname.substr(-(maxLength - 1) / 2) : fname

  function extensionIconLabel (name: string): string {
    const parts = name.split('.')
    const ext = parts[parts.length - 1]
    return ext.substring(0, 4).toUpperCase()
  }

  function isPDF (contentType: string) {
    return contentType.includes('application/pdf')
  }
  function isImage (contentType: string) {
    return contentType.startsWith('image/')
  }
  function isEmbedded (contentType: string) {
    return isPDF(contentType) || isImage(contentType)
  }

  function openAttachment () {
    closeTooltip()
    showPopup(
      PDFViewer,
      { file: value.file, name: value.name, contentType: value.type },
      isImage(value.type) ? 'centered' : 'float'
    )
  }
</script>

<div class="gridCellOverlay">
  <div class="gridCell">
    {#if isImage(value.type)}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="cellImagePreview" on:click={openAttachment}>
        <img class={'img-fit'} src={getFileUrl(value.file, 'full', value.name)} alt={value.name} />
      </div>
    {:else}
      <div class="cellMiscPreview">
        {#if isPDF(value.type)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div class="flex-center extensionIcon" on:click={openAttachment}>
            {extensionIconLabel(value.name)}
          </div>
        {:else}
          <a class="no-line" href={getFileUrl(value.file, 'full', value.name)} download={value.name}>
            <div class="flex-center extensionIcon">{extensionIconLabel(value.name)}</div>
          </a>
        {/if}
      </div>
    {/if}

    <div class="cellInfo">
      {#if isEmbedded(value.type)}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="flex-center extensionIcon" on:click={openAttachment}>
          {extensionIconLabel(value.name)}
        </div>
      {:else}
        <a class="no-line" href={getFileUrl(value.file, 'full', value.name)} download={value.name}>
          <div class="flex-center extensionIcon">{extensionIconLabel(value.name)}</div>
        </a>
      {/if}
      <div class="eCellInfoData">
        {#if isEmbedded(value.type)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div class="eCellInfoFilename" on:click={openAttachment}>
            {trimFilename(value.name)}
          </div>
        {:else}
          <div class="eCellInfoFilename">
            <a href={getFileUrl(value.file, 'full', value.name)} download={value.name}>{trimFilename(value.name)}</a>
          </div>
        {/if}
        <div class="eCellInfoFilesize">{filesize(value.size)}</div>
      </div>
      <div class="eCellInfoMenu"><slot name="rowMenu" /></div>
    </div>
  </div>
</div>

<style lang="scss">
  .gridCellOverlay {
    position: relative;
    padding: 0.5rem;
  }

  .gridCell {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    border-radius: 0.75rem;
    justify-content: space-between;
    overflow: hidden;
    border: 1px solid var(--theme-divider-color);
  }

  .cellImagePreview {
    display: flex;
    justify-content: center;
    height: 10rem;
    overflow: hidden;
    background-color: var(--theme-bg-color);
    cursor: pointer;
  }

  .cellMiscPreview {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 10rem;
  }

  .img-fit {
    object-fit: cover;
    height: 100%;
    width: 100%;
  }

  .cellInfo {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 0.75rem;
    height: 4rem;
    background-color: var(--theme-bg-accent-color);
    border-top: 1px solid var(--theme-divider-color);

    .eCellInfoData {
      display: flex;
      flex-direction: column;
      margin-left: 1rem;
    }

    .eCellInfoMenu {
      margin-left: auto;
      position: absolute;
      bottom: 1rem;
      right: 0.5rem;
    }

    .eCellInfoFilename {
      font-weight: 500;
      color: var(--theme-caption-color);
      white-space: nowrap;
      cursor: pointer;
    }

    .eCellInfoFilesize {
      font-size: 0.75rem;
      color: var(--theme-dark-color);
    }
  }

  .extensionIcon {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    font-weight: 500;
    font-size: 0.625rem;
    color: var(--accented-button-color);
    background-color: var(--accented-button-default);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.5rem;
    cursor: pointer;
  }

  .eCellInfoFilename:hover,
  .extensionIcon:hover + .eCellInfoData > .eCellInfoFilename, // embedded on extension hover
  .no-line:hover + .eCellInfoData > .eCellInfoFilename a, // not embedded on extension hover
  .cellImagePreview:hover + .cellInfo .eCellInfoFilename, // image on preview hover
  .cellMiscPreview:hover + .cellInfo .eCellInfoFilename, // PDF on preview hover
  .cellMiscPreview:hover + .cellInfo .eCellInfoFilename a // not embedded on preview hover
  {
    text-decoration: underline;
    color: var(--theme-caption-color);
  }
  .eCellInfoFilename:active,
  .extensionIcon:active + .eCellInfoData > .eCellInfoFilename, // embedded on extension hover
  .no-line:active + .eCellInfoData > .eCellInfoFilename a, // not embedded on extension hover
  .cellImagePreview:active + .cellInfo .eCellInfoFilename, // image on preview hover
  .cellMiscPreview:active + .cellInfo .eCellInfoFilename, // PDF on preview hover
  .cellMiscPreview:active + .cellInfo .eCellInfoFilename a // not embedded on preview hover
  {
    text-decoration: underline;
    color: var(--theme-caption-color);
  }
</style>
