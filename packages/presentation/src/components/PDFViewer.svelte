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
  import { Doc } from '@hcengineering/core'
  import { Button, Dialog, PopupOptions } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import presentation from '..'
  import { getFileUrl } from '../utils'
  import Download from './icons/Download.svelte'
  import ActionContext from './ActionContext.svelte'

  export let file: string
  export let name: string
  export let contentType: string | undefined
  export let popupOptions: PopupOptions
  export let value: Doc

  const dispatch = createEventDispatcher()
  // let imgView: 'img-horizontal-fit' | 'img-vertical-fit' | 'img-original-fit' = 'img-vertical-fit'

  function iconLabel (name: string): string {
    const parts = name.split('.')
    const ext = parts[parts.length - 1]
    return ext.substring(0, 4).toUpperCase()
  }
  // onMount(() => {
  //   dispatch('fullsize')
  // })
  let download: HTMLAnchorElement
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
      <div class="wrapped-icon">
        <div class="flex-center icon">
          {iconLabel(name)}
        </div>
      </div>
      <span class="wrapped-title">{name}</span>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="utils">
    <a class="no-line" href={getFileUrl(file, 'full', name)} download={name} bind:this={download}>
      <Button
        icon={Download}
        kind={'ghost'}
        on:click={() => {
          download.click()
        }}
        showTooltip={{ label: presentation.string.Download }}
      />
    </a>
  </svelte:fragment>

  {#if contentType && contentType.startsWith('image/')}
    <div class="pdfviewer-content img">
      <img class="img-fit" src={getFileUrl(file, 'full', name)} alt="" />
    </div>
  {:else}
    <iframe class="pdfviewer-content" src={getFileUrl(file, 'full', name) + '#view=FitH&navpanes=0'} title="" />
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
    color: var(--accented-button-color);
    background-color: var(--accented-button-default);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.5rem;
    cursor: pointer;
  }
  .pdfviewer-content {
    flex-grow: 1;
    overflow: auto;
    border-style: none;
    border-radius: 0.5rem;
    background-color: var(--theme-bg-color);

    &.img {
      display: flex;
      align-items: center;
      min-width: 0;
      min-height: 0;
    }
  }
  .img-fit {
    margin: 0 auto;
    width: fit-content;
    height: fit-content;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .img-horizontal-fit,
  .img-vertical-fit,
  .img-original-fit {
    margin: 0 auto;
    width: auto;
    height: auto;
  }
  .img-horizontal-fit {
    width: 100%;
  }
  .img-vertical-fit {
    height: 100%;
  }
  .pdfviewer-header {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    flex-direction: row-reverse;
    align-items: center;
  }
  .img-nav {
    display: grid;
    grid-template-columns: auto;
    grid-auto-flow: column;
    grid-auto-columns: min-content;
    gap: 0.5rem;
    align-items: center;
  }
  .space {
    min-height: 0.5rem;
    height: 0.5rem;
  }
</style>
