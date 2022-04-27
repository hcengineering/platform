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
  import type { Attachment } from '@anticrm/attachment'
  import { showPopup, closeTooltip } from '@anticrm/ui'
  import { PDFViewer, getFileUrl } from '@anticrm/presentation'
  import filesize from 'filesize'

  export let value: Attachment

  const maxLength: number = 20
  const trimFilename = (fname: string): string =>
    fname.length > maxLength ? fname.substr(0, (maxLength - 1) / 2) + '...' + fname.substr(-(maxLength - 1) / 2) : fname

  function iconLabel (name: string): string {
    const parts = name.split('.')
    const ext = parts[parts.length - 1]
    return ext.substring(0, 4).toUpperCase()
  }

  function openEmbedded (contentType: string) {
    return contentType.includes('application/pdf') || contentType.startsWith('image/')
  }

  function openAttachment () {
    closeTooltip()
    showPopup(PDFViewer, { file: value.file, name: value.name, contentType: value.type }, 'right')
  }
</script>

<div class="gridCellOverlay">
  <div class="gridCell">
    <div class="cellInfo">
      {#if openEmbedded(value.type)}
        <div class="flex-center icon" on:click={openAttachment}>
          {iconLabel(value.name)}
        </div>
      {:else}
        <a class="no-line" href={getFileUrl(value.file)} download={value.name}>
          <div class="flex-center icon">{iconLabel(value.name)}</div>
        </a>
      {/if}
      <div class="eCellInfoData">
        {#if openEmbedded(value.type)}
          <div class="name" on:click={openAttachment}>
            {trimFilename(value.name)}
          </div>
        {:else}
          <div class="name">
            <a href={getFileUrl(value.file)} download={value.name}>{trimFilename(value.name)}</a>
          </div>
        {/if}
        <div class="type">{filesize(value.size)}</div>
      </div>
      <div class="eCellMenu"><slot name="rowMenu" /></div>
    </div>
    {#if value.type.startsWith('image/')}
      <div class="cellImagePreview">
        <img class={'img-vertical-fit'} src={getFileUrl(value.file)} alt={value.name} />
      </div>
    {:else}
      <div class="cellMiscPreview">
        <div class="flex-center icon">{iconLabel(value.name)}</div>
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .gridCellOverlay {
    position: relative;
    padding: 4px;
  }

  .gridCell {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    justify-content: space-between;
    overflow: hidden;
    box-shadow: 0 0 0 1px var(--theme-content-accent-color);
  }

  .cellInfo {
    display: flex;
    flex-direction: row;
    padding: 12px;
    min-height: 36px;
    align-items: center;

    .eCellInfoData {
      display: flex;
      flex-direction: column;
    }

    .eCellMenu {
      margin-left: auto;
    }
  }

  .cellImagePreview {
    display: flex;
    justify-content: center;
    height: 160px;
    overflow: auto;
    margin: 0 1.5rem;
    border-radius: 0.5rem;
    background-color: var(--theme-menu-color);
  }

  .cellMiscPreview {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 160px;
  }

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
  .icon:hover + .eCellInfoData > .name,
  .no-line:hover + .eCellInfoData > .name a {
    text-decoration: underline;
    color: var(--theme-caption-color);
  }
  .name:active,
  .icon:active + .eCellInfoData > .name,
  .no-line:active + .eCellInfoData > .name a {
    text-decoration: underline;
    color: var(--theme-content-accent-color);
  }
</style>
