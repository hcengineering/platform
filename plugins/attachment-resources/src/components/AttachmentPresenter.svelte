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
  import { createEventDispatcher } from 'svelte'
  import type { Attachment } from '@hcengineering/attachment'
  import { showPopup, closeTooltip, Icon, IconClose } from '@hcengineering/ui'
  import { PDFViewer, getFileUrl } from '@hcengineering/presentation'
  import filesize from 'filesize'

  export let value: Attachment
  export let removable: boolean = false

  const dispatch = createEventDispatcher()

  const maxLenght: number = 16
  const trimFilename = (fname: string): string =>
    fname.length > maxLenght ? fname.substr(0, (maxLenght - 1) / 2) + '...' + fname.substr(-(maxLenght - 1) / 2) : fname

  function iconLabel (name: string): string {
    const parts = `${name}`.split('.')
    const ext = parts[parts.length - 1]
    return ext.substring(0, 4).toUpperCase()
  }
  function isImage (contentType: string) {
    return contentType.startsWith('image/')
  }
  function openEmbedded (contentType: string) {
    return (
      contentType.includes('application/pdf') ||
      contentType.startsWith('image/') ||
      contentType.startsWith('application/msword')
    )
  }
</script>

<div class="flex-row-center attachment-container">
  {#if openEmbedded(value.type)}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="flex-center icon"
      on:click={() => {
        closeTooltip()
        showPopup(
          PDFViewer,
          { file: value.file, name: value.name, contentType: value.type, value },
          isImage(value.type) ? 'centered' : 'float'
        )
      }}
    >
      {iconLabel(value.name)}
      {#if removable}
        <div
          class="remove-btn"
          on:click|preventDefault={(ev) => {
            ev.stopPropagation()
            dispatch('remove')
          }}
        >
          <Icon icon={IconClose} size={'medium'} />
        </div>
      {/if}
    </div>
  {:else}
    <a class="no-line" href={getFileUrl(value.file)} download={value.name}>
      <div class="flex-center icon">
        {iconLabel(value.name)}
        {#if removable}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="remove-btn"
            on:click={(ev) => {
              ev.stopPropagation()
              dispatch('remove')
            }}
          >
            <Icon icon={IconClose} size={'medium'} />
          </div>
        {/if}
      </div>
    </a>
  {/if}
  <div class="flex-col info">
    {#if openEmbedded(value.type)}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="name"
        on:click={() => {
          closeTooltip()
          showPopup(
            PDFViewer,
            { file: value.file, name: value.name, contentType: value.type, value },
            isImage(value.type) ? 'centered' : 'float'
          )
        }}
      >
        {trimFilename(value.name)}
      </div>
    {:else}
      <div class="name"><a href={getFileUrl(value.file)} download={value.name}>{trimFilename(value.name)}</a></div>
    {/if}
    <div class="type">{filesize(value.size)}</div>
  </div>
</div>

<style lang="scss">
  .icon {
    position: relative;
    flex-shrink: 0;
    margin-right: 1rem;
    width: 2rem;
    height: 2rem;
    font-weight: 500;
    font-size: 0.625rem;
    color: var(--white-color);
    background-color: var(--primary-bg-color);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.25rem;
    cursor: pointer;

    .remove-btn {
      position: absolute;
      display: flex;
      justify-content: center;
      align-items: center;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: var(--primary-bg-hover);
      border-radius: 0.25rem;
      opacity: 0;
    }
  }
  .attachment-container {
    margin-right: 0.5rem;
    // padding: .375rem;
    // width: 14rem;
    // min-width: 14rem;
    // max-width: 14rem;
    // background-color: var(--accent-bg-color);
    // border: 1px solid var(--divider-color);
    // border-radius: .25rem;

    &:hover .remove-btn {
      opacity: 1;
    }
  }

  .name {
    white-space: nowrap;
    font-weight: 500;
    color: var(--accent-color);
    cursor: pointer;
  }

  .type {
    white-space: nowrap;
    font-size: 0.75rem;
    color: var(--dark-color);
  }

  .name:hover,
  .icon:hover + .info > .name,
  .no-line:hover + .info > .name a {
    text-decoration: underline;
    color: var(--caption-color);
  }
  .name:active,
  .icon:active + .info > .name,
  .no-line:active + .info > .name a {
    text-decoration: underline;
    color: var(--accent-color);
  }
</style>
