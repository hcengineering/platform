<!--
// Copyright © 2022 Hardcore Engineering Inc
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
  import { PDFViewer, getFileUrl } from '@anticrm/presentation'
  import { Button, showPopup, TimeSince, closeTooltip } from '@anticrm/ui'
  import board from '../../plugin'
  import { getPopupAlignment } from '../../utils/PopupUtils'
  import EditAttachment from '../popups/EditAttachment.svelte'
  import RemoveAttachment from '../popups/RemoveAttachment.svelte'

  export let value: Attachment

  const maxLenght: number = 30
  const trimFilename = (fname: string): string =>
    fname.length > maxLenght ? fname.substr(0, (maxLenght - 1) / 2) + '...' + fname.substr(-(maxLenght - 1) / 2) : fname

  function iconLabel (name: string): string {
    const parts = name.split('.')
    const ext = parts[parts.length - 1]
    return ext.substring(0, 4).toUpperCase()
  }

  function openEmbedded (contentType: string) {
    return contentType.includes('application/pdf') || contentType.startsWith('image/')
  }

  function showPreview (contentType: string) {
    return contentType.startsWith('image/')
  }

  function handleClick () {
    closeTooltip()
    showPopup(PDFViewer, { file: value.file, name: value.name, contentType: value.type }, 'right')
  }
</script>

<div class="flex-row-center">
  {#if openEmbedded(value.type)}
    <div class="flex-center cursor-pointer icon" on:click={handleClick}>
      {#if showPreview(value.type)}
        <img src={getFileUrl(value.file)} alt={value.name}/>
      {:else}
        {iconLabel(value.name)}
      {/if}
    </div>
  {:else}
    <a class="no-line" href={getFileUrl(value.file)} download={value.name}>
      <div class="flex-center icon">
        {iconLabel(value.name)}
      </div>
    </a>
  {/if}
  <div class="flex-col-centre info">
    <div class="fs-title">{trimFilename(value.name)}</div>
    <div class="flex-row-center flex-gap-1">
      <TimeSince value={value.lastModified}/>
      <Button
        label={board.string.Edit}
        on:click={(e) => {
          showPopup(EditAttachment, { object: value }, getPopupAlignment(e))
        }}
        kind="transparent"/>
      <Button
        label={board.string.Delete}
        on:click={(e) => {
          showPopup(RemoveAttachment, { object: value }, getPopupAlignment(e))
        }}
        kind="transparent"/>
    </div>
  </div>
</div>

<style lang="scss">
  .icon {
    flex-shrink: 0;
    margin-right: 1rem;
    width: 8rem;
    height: 6rem;
    font-weight: 500;
    font-size: 1rem;
    color: var(--primary-button-color);
    background-color: var(--grayscale-grey-03);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.5rem;
    overflow: hidden;

    img {
      max-width: 8rem;
      max-height: 6rem;
    }
  }
</style>
