<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2025 Hardcore Engineering Inc.
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
  import core, { type WithLookup } from '@hcengineering/core'
  import presentation, {
    canPreviewFile,
    getBlobRef,
    getFileUrl,
    previewTypes,
    getJsonOrEmpty,
    sizeToWidth
  } from '@hcengineering/presentation'
  import { Label, Spinner } from '@hcengineering/ui'
  import { permissionsStore } from '@hcengineering/view-resources'
  import filesize from 'filesize'
  import { createEventDispatcher } from 'svelte'
  import { getType, openAttachmentInSidebar, showAttachmentPreviewPopup } from '../utils'
  import AttachmentName from './AttachmentName.svelte'

  export let value: WithLookup<Attachment> | undefined
  export let removable: boolean = false
  export let showPreview = false
  export let preview = false

  const dispatch = createEventDispatcher()

  const maxLength: number = 30

  const trimFilename = (fname: string): string =>
    fname.length > maxLength ? fname.substr(0, (maxLength - 1) / 2) + '...' + fname.substr(-(maxLength - 1) / 2) : fname

  $: canRemove =
    removable &&
    value !== undefined &&
    value.readonly !== true &&
    ($permissionsStore.whitelist.has(value.space) ||
      !$permissionsStore.ps[value.space]?.has(core.permission.ForbidDeleteObject))

  function iconLabel (name: string): string {
    const parts = `${name}`.split('.')
    const ext = parts[parts.length - 1]
    return ext.substring(0, 4).toUpperCase()
  }
  function isImage (contentType: string): boolean {
    return getType(contentType) === 'image'
  }

  let canPreview = false
  let useDefaultIcon = false
  const canLinkPreview = value?.type.includes('link-preview') ?? false

  $: if (value !== undefined) {
    void canPreviewFile(value.type, $previewTypes).then((res) => {
      canPreview = res
    })
  } else {
    canPreview = false
  }

  async function clickHandler (e: MouseEvent): Promise<void> {
    if (value === undefined || !canPreview) return

    e.preventDefault()
    e.stopPropagation()
    if (e.metaKey || e.ctrlKey) {
      window.open((e.target as HTMLAnchorElement).href, '_blank')
      return
    }
    if (value.type.startsWith('image/') || value.type.startsWith('video/') || value.type.startsWith('audio/')) {
      showAttachmentPreviewPopup(value)
    } else {
      await openAttachmentInSidebar(value)
    }
  }

  function middleClickHandler (e: MouseEvent): void {
    if (e.button !== 1) return
    e.preventDefault()
    e.stopPropagation()
    window.open((e.target as HTMLAnchorElement).href, '_blank')
  }

  let download: HTMLAnchorElement

  function dragStart (event: DragEvent): void {
    if (value === undefined) return
    const url = encodeURI(getFileUrl(value.file))
    event.dataTransfer?.setData('application/contentType', value.type)
    event.dataTransfer?.setData('text/plain', getFileUrl(value.file))
    event.dataTransfer?.setData('text/uri-list', url + '\r\n')
  }
</script>

{#if preview}
  <AttachmentName {value} />
{:else}
  <div class="flex-row-center attachment-container">
    {#if value}
      {#if canLinkPreview}
        {#await getJsonOrEmpty(value.file, value.name)}
          <Spinner size="small" />
        {:then linkPreviewDetails}
          <div class="flex-center icon">
            {#if linkPreviewDetails.icon !== undefined && !useDefaultIcon}
              <img
                src={linkPreviewDetails.icon}
                class="link-preview-icon"
                alt="link-preview"
                on:error={() => {
                  useDefaultIcon = true
                }}
              />
            {:else}
              <svg class="link-preview-icon" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M14 0.000244141C11.2311 0.000244141 8.52431 0.82133 6.22202 2.35967C3.91973 3.89801 2.12532 6.08451 1.06569 8.64268C0.00606596 11.2008 -0.271181 14.0158 0.269012 16.7315C0.809205 19.4472 2.14258 21.9418 4.10051 23.8997C6.05845 25.8577 8.55301 27.191 11.2687 27.7312C13.9845 28.2714 16.7994 27.9942 19.3576 26.9346C21.9157 25.8749 24.1022 24.0805 25.6406 21.7782C27.1789 19.4759 28 16.7692 28 14.0002C28 10.2872 26.525 6.72626 23.8995 4.10075C21.274 1.47524 17.713 0.000244141 14 0.000244141ZM26 13.0002H20C19.8833 9.31733 18.9291 5.70939 17.21 2.45024C19.5786 3.09814 21.6914 4.45709 23.2632 6.34367C24.8351 8.23024 25.7903 10.5536 26 13.0002ZM14 26.0002C13.7769 26.0152 13.5531 26.0152 13.33 26.0002C11.2583 22.6964 10.1085 18.8984 10 15.0002H18C17.9005 18.8956 16.7612 22.6934 14.7 26.0002C14.467 26.0166 14.2331 26.0166 14 26.0002ZM10 13.0002C10.0995 9.10492 11.2388 5.30707 13.3 2.00024C13.7453 1.95021 14.1947 1.95021 14.64 2.00024C16.7223 5.30104 17.8825 9.09931 18 13.0002H10ZM10.76 2.45024C9.0513 5.71189 8.10746 9.31969 8.00001 13.0002H2.00001C2.20971 10.5536 3.16495 8.23024 4.7368 6.34367C6.30865 4.45709 8.42144 3.09814 10.79 2.45024H10.76ZM2.05001 15.0002H8.05001C8.15437 18.68 9.09478 22.2878 10.8 25.5502C8.43887 24.8954 6.33478 23.5334 4.77056 21.6474C3.20634 19.7614 2.25695 17.4418 2.05001 15.0002ZM17.21 25.5502C18.9291 22.2911 19.8833 18.6832 20 15.0002H26C25.7903 17.4469 24.8351 19.7702 23.2632 21.6568C21.6914 23.5434 19.5786 24.9023 17.21 25.5502Z"
                  fill="black"
                />
              </svg>
            {/if}
          </div>
          <div class="flex-col info-container">
            <div class="name">
              <a target="_blank" class="no-line" style:flex-shrink={0} href={linkPreviewDetails.url}
                >{trimFilename(linkPreviewDetails?.title ?? value.name)}</a
              >
            </div>
            <div class="info-content flex-row-center">
              <span class="actions inline-flex clear-mins gap-1">
                {#if linkPreviewDetails.description}
                  {trimFilename(linkPreviewDetails.description)}
                  <span>•</span>
                {/if}
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
              </span>
            </div>
          </div>
        {/await}
      {:else}
        {#await getBlobRef(value.file, value.name, sizeToWidth('large')) then valueRef}
          <a
            class="no-line"
            style:flex-shrink={0}
            href={valueRef.src}
            download={value.name}
            on:click={clickHandler}
            on:mousedown={middleClickHandler}
            on:dragstart={dragStart}
          >
            {#if showPreview && isImage(value.type)}
              <img
                src={valueRef.src}
                data-id={value.file}
                srcset={valueRef.srcset}
                class="flex-center icon"
                class:svg={value.type === 'image/svg+xml'}
                class:image={isImage(value.type)}
                alt={value.name}
              />
            {:else}
              <div class="flex-center icon">
                {iconLabel(value.name)}
              </div>
            {/if}
          </a>
          <div class="flex-col info-container">
            <div class="name">
              <a href={valueRef.src} download={value.name} on:click={clickHandler} on:mousedown={middleClickHandler}>
                {trimFilename(value.name)}
              </a>
            </div>
            <div class="info-content flex-row-center">
              {filesize(value.size, { spacer: '' })}
              <span class="actions inline-flex clear-mins ml-1 gap-1">
                <span>•</span>
                <a class="no-line colorInherit" href={valueRef.src} download={value.name} bind:this={download}>
                  <Label label={presentation.string.Download} />
                </a>
                {#if canRemove}
                  <span>•</span>
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
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
        {/await}
      {/if}
    {/if}
  </div>
{/if}

<style lang="scss">
  .link-preview-icon {
    max-width: 32px;
    max-height: 32px;
  }
  .attachment-container {
    flex-shrink: 0;
    width: auto;
    height: 3rem;
    min-width: 17.25rem;
    border-radius: 0.25rem;

    .icon {
      flex-shrink: 0;
      width: 3rem;
      height: 3rem;
      object-fit: contain;
      border: 1px solid var(--theme-button-border);
      border-radius: 0.25rem 0 0 0.25rem;
      cursor: pointer;

      &:not(.image) {
        color: var(--primary-button-color);
        background-color: var(--primary-button-default);
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
    .no-line:hover + .info-container > .name a {
      text-decoration: underline;
      color: var(--theme-caption-color);
    }
    .name:active,
    .no-line:active + .info-container > .name a {
      text-decoration: underline;
      color: var(--theme-caption-color);
    }
  }
</style>
