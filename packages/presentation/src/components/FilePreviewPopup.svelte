<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { type Blob, type Ref } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Button, Dialog, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'

  import presentation from '../plugin'

  import { getFileUrl } from '../file'
  import { BlobMetadata } from '../types'

  import ActionContext from './ActionContext.svelte'
  import FilePreview from './FilePreview.svelte'
  import Download from './icons/Download.svelte'

  export let file: Ref<Blob> | undefined
  export let name: string
  export let contentType: string
  export let metadata: BlobMetadata | undefined
  export let props: Record<string, any> = {}

  export let fullSize = false
  export let showIcon = true

  const dispatch = createEventDispatcher()

  let download: HTMLAnchorElement

  onMount(() => {
    if (fullSize) {
      dispatch('fullsize')
    }
  })

  function iconLabel (name: string): string {
    const parts = `${name}`.split('.')
    const ext = parts[parts.length - 1]
    return ext.substring(0, 4).toUpperCase()
  }

  $: srcRef = file !== undefined ? getFileUrl(file, name) : undefined
</script>

<ActionContext context={{ mode: 'browser' }} />
<Dialog
  isFullSize
  on:fullsize
  on:close={() => {
    dispatch('close')
  }}
>
  <svelte:fragment slot="title">
    <div class="antiTitle icon-wrapper">
      {#if showIcon}
        <div class="wrapped-icon">
          <div class="flex-center icon">
            {iconLabel(name)}
          </div>
        </div>
      {/if}
      <span class="wrapped-title" use:tooltip={{ label: getEmbeddedLabel(name) }}>{name}</span>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="utils">
    {#await srcRef then src}
      {#if src !== ''}
        <a class="no-line" href={src} download={name} bind:this={download}>
          <Button
            icon={Download}
            kind={'ghost'}
            on:click={() => {
              download.click()
            }}
            showTooltip={{ label: presentation.string.Download }}
          />
        </a>
      {/if}
    {/await}
  </svelte:fragment>

  {#if file}
    <FilePreview {file} {contentType} {name} {metadata} {props} fit />
  {/if}
</Dialog>

<style lang="scss">
  .icon {
    position: relative;
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    font-weight: 500;
    font-size: 0.625rem;
    color: var(--primary-button-color);
    background-color: var(--primary-button-default);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.5rem;
    cursor: pointer;
  }
</style>
