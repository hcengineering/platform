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
  import { Button, CircleButton, IconClose, ActionIcon } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import presentation from '..'
  import { getFileUrl } from '../utils'
  import Avatar from './Avatar.svelte'
  import MaximizeH from './icons/MaximizeH.svelte'
  import MaximizeV from './icons/MaximizeV.svelte'
  import MaximizeO from './icons/MaximizeO.svelte'

  export let file: string
  export let name: string
  export let contentType: string | undefined

  const dispatch = createEventDispatcher()
  let imgView: 'img-horizontal-fit' | 'img-vertical-fit' | 'img-original-fit' = 'img-horizontal-fit'
</script>

<div
  class="antiOverlay"
  on:click={() => {
    dispatch('close')
  }}
/>
<div class="antiDialogs antiComponent pdfviewer-container">
  <div class="ac-header short mirror">
    <div class="ac-header__wrap-title">
      <div class="ac-header__icon"><Avatar size={'medium'} /></div>
      <span class="ac-header__title">{name}</span>
    </div>
    <ActionIcon icon={IconClose} size={'medium'} action={() => dispatch('close')} />
  </div>

  {#if contentType && contentType.startsWith('image/')}
    <div class="pdfviewer-content">
      <img class={imgView} src={getFileUrl(file)} alt="" />
    </div>
  {:else}
    <iframe class="pdfviewer-content" src={getFileUrl(file)} title="" />
  {/if}

  <div class="pdfviewer-footer">
    <div class="flex-row-reverse">
      <a class="no-line ml-4" href={getFileUrl(file)} download={name}
        ><Button label={presentation.string.Download} kind={'primary'} /></a
      >
      <Button
        label={presentation.string.Close}
        on:click={() => {
          dispatch('close')
        }}
      />
    </div>
    {#if contentType && contentType.startsWith('image/')}
      <div class="img-nav">
        <CircleButton
          icon={MaximizeH}
          on:click={() => {
            imgView = 'img-horizontal-fit'
          }}
          selected={imgView === 'img-horizontal-fit'}
        />
        <CircleButton
          icon={MaximizeV}
          on:click={() => {
            imgView = 'img-vertical-fit'
          }}
          selected={imgView === 'img-vertical-fit'}
        />
        <CircleButton
          icon={MaximizeO}
          on:click={() => {
            imgView = 'img-original-fit'
          }}
          selected={imgView === 'img-original-fit'}
        />
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .pdfviewer-container {
    left: 40%;
  }
  .pdfviewer-content {
    flex-grow: 1;
    overflow: auto;
    margin: 0 1.5rem;
    border-style: none;
    border-radius: 0.5rem;
    background-color: var(--theme-menu-color);
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
  .pdfviewer-footer {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    flex-direction: row-reverse;
    align-items: center;
    padding: 0 2.25rem;
    height: 5.25rem;
  }
  .img-nav {
    display: grid;
    grid-template-columns: auto;
    grid-auto-flow: column;
    grid-auto-columns: min-content;
    gap: 0.5rem;
    align-items: center;
  }
</style>
