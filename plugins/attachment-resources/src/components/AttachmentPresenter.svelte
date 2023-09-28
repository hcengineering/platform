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
  import { showPopup, closeTooltip, Label, getIconSize2x, Loading } from '@hcengineering/ui'
  import presentation, { PDFViewer, getFileUrl } from '@hcengineering/presentation'
  import filesize from 'filesize'

  export let value: Attachment
  export let removable: boolean = false
  export let showPreview = false

  export let progress: boolean = false

  const dispatch = createEventDispatcher()

  const maxLenght: number = 30
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
    return contentType.includes('application/pdf') || contentType.startsWith('image/')
  }

  function clickHandler (e: MouseEvent) {
    if (!openEmbedded(value.type)) return
    e.preventDefault()
    e.stopPropagation()
    if (e.metaKey || e.ctrlKey) {
      window.open((e.target as HTMLAnchorElement).href, '_blank')
      return
    }
    closeTooltip()
    showPopup(
      PDFViewer,
      { file: value.file, name: value.name, contentType: value.type, value },
      isImage(value.type) ? 'centered' : 'float'
    )
  }

  function middleClickHandler (e: MouseEvent) {
    if (e.button !== 1) return
    e.preventDefault()
    e.stopPropagation()
    window.open((e.target as HTMLAnchorElement).href, '_blank')
  }

  let download: HTMLAnchorElement

  $: imgStyle = isImage(value.type)
    ? `background-image: url(${getFileUrl(value.file, 'large')});
       background-image: -webkit-image-set(
        ${getFileUrl(value.file, 'large')} 1x,
        ${getFileUrl(value.file, getIconSize2x('large'))} 2x
      );
      background-image: image-set(
        ${getFileUrl(value.file, 'large')} 1x,
        ${getFileUrl(value.file, getIconSize2x('large'))} 2x
      );`
    : ''
  function dragStart (event: DragEvent): void {
    event.dataTransfer?.setData('application/contentType', value.type)
  }
</script>

<div class="flex-row-center attachment-container">
  <a
    class="no-line"
    style:flex-shrink={0}
    href={getFileUrl(value.file, 'full', value.name)}
    download={value.name}
    on:click={clickHandler}
    on:mousedown={middleClickHandler}
    on:dragstart={dragStart}
  >
    {#if showPreview}
      <div
        class="flex-center icon"
        class:svg={value.type === 'image/svg+xml'}
        class:image={isImage(value.type)}
        style={imgStyle}
      >
        {#if progress}
          <div class="flex p-3">
            <Loading />
          </div>
        {:else if !isImage(value.type)}{iconLabel(value.name)}{/if}
      </div>
    {:else}
      <div class="flex-center icon">
        {iconLabel(value.name)}
      </div>
    {/if}
  </a>
  <div class="flex-col info-container">
    <div class="name">
      <a
        href={getFileUrl(value.file, 'full', value.name)}
        download={value.name}
        on:click={clickHandler}
        on:mousedown={middleClickHandler}
      >
        {trimFilename(value.name)}
      </a>
    </div>
    <div class="info-content flex-row-center">
      {filesize(value.size, { spacer: '' })}
      <span class="actions inline-flex clear-mins ml-1 gap-1">
        <span>•</span>
        <a
          class="no-line colorInherit"
          href={getFileUrl(value.file, 'full', value.name)}
          download={value.name}
          bind:this={download}
        >
          <Label label={presentation.string.Download} />
        </a>
        {#if removable && value.readonly !== true}
          <span>•</span>
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <span
            class="remove-link"
            on:click={(ev) => {
              ev.stopPropagation()
              ev.preventDefault()
              dispatch('remove', value)
            }}
          >
            <Label label={presentation.string.Delete} />
          </span>
        {/if}
      </span>
    </div>
  </div>
</div>

<style lang="scss">
  .attachment-container {
    flex-shrink: 0;
    width: auto;
    height: 3rem;
    min-width: 14rem;
    max-width: 19rem;
    border-radius: 0.25rem;

    .icon {
      flex-shrink: 0;
      width: 3rem;
      height: 3rem;
      border: 1px solid var(--theme-button-border);
      border-radius: 0.25rem 0 0 0.25rem;
      cursor: pointer;

      &:not(.image) {
        color: var(--accented-button-color);
        background-color: var(--accented-button-default);
      }
      &.svg {
        background-color: #fff;
      }
      &.image {
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
      }
    }
    .info-container {
      padding: 0.5rem 0.75rem;
      width: 100%;
      height: 100%;
      background-color: var(--theme-button-default);
      border: 1px solid var(--theme-button-border);
      border-left: none;
      border-radius: 0 0.25rem 0.25rem 0;
    }
    .no-line:hover ~ .info-container,
    .info-container:hover {
      background-color: var(--theme-button-hovered);

      .actions {
        opacity: 1;
      }
    }
    .name {
      white-space: nowrap;
      font-size: 0.8125rem;
      color: var(--theme-caption-color);
      cursor: pointer;

      &:hover ~ .info-content .actions {
        opacity: 1;
      }
    }
    .info-content {
      white-space: nowrap;
      font-size: 0.6875rem;
      color: var(--theme-darker-color);

      .actions {
        opacity: 0;
        transition: opacity 0.1s var(--timing-main);
      }
      &:hover .actions {
        opacity: 1;
      }
    }
    .remove-link {
      color: var(--theme-error-color);
      cursor: pointer;

      &:hover {
        text-decoration-line: underline;
      }
    }
    a.colorInherit {
      color: inherit;

      &:hover {
        text-decoration: underline;
        color: var(--theme-dark-color);
      }
    }

    .name:hover,
    .icon:hover + .info-container > .name,
    .no-line:hover + .info-container > .name a {
      text-decoration: underline;
      color: var(--theme-caption-color);
    }
    .name:active,
    .icon:active + .info-container > .name,
    .no-line:active + .info-container > .name a {
      text-decoration: underline;
      color: var(--theme-caption-color);
    }
  }
</style>
