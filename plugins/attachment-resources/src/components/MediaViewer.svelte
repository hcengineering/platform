<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  // import { Doc } from '@hcengineering/core'
  import type { Attachment } from '@hcengineering/attachment'
  import type { WithLookup } from '@hcengineering/core'
  import presentation, { ActionContext, IconDownload, getBlobHref, getBlobRef } from '@hcengineering/presentation'
  import { Button, Dialog } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import { getType } from '../utils'
  import AudioPlayer from './AudioPlayer.svelte'

  export let value: WithLookup<Attachment>
  export let showIcon = true
  export let fullSize = false

  const dispatch = createEventDispatcher()

  function iconLabel (name: string): string {
    const parts = name.split('.')
    const ext = parts[parts.length - 1]
    return ext.substring(0, 4).toUpperCase()
  }
  onMount(() => {
    if (fullSize) {
      dispatch('fullsize')
    }
  })
  let download: HTMLAnchorElement
  $: type = getType(value.type)
  $: srcRef = getBlobHref(value.$lookup?.file, value.file, value.name)
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
            {iconLabel(value.name)}
          </div>
        </div>
      {/if}
      <span class="wrapped-title">{value.name}</span>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="utils">
    {#await srcRef then src}
      <a class="no-line" href={src} download={value.name} bind:this={download}>
        <Button
          icon={IconDownload}
          kind={'ghost'}
          on:click={() => {
            download.click()
          }}
          showTooltip={{ label: presentation.string.Download }}
        />
      </a>
    {/await}
  </svelte:fragment>

  {#if type === 'video'}
    <video controls preload={'auto'}>
      {#await srcRef then src}
        <source {src} />
      {/await}
      <track kind="captions" label={value.name} />
    </video>
  {:else if type === 'audio'}
    <AudioPlayer {value} fullSize={true} />
  {:else}
    {#await srcRef then src}
      <iframe class="pdfviewer-content" src={src + '#view=FitH&navpanes=0'} title="" />
    {/await}
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

  video {
    max-width: 100%;
    max-height: 100%;
    border-radius: 0.75rem;
  }
</style>
