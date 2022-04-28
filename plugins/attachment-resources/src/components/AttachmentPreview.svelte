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
  import type { Attachment } from '@anticrm/attachment'
  import { getFileUrl, PDFViewer } from '@anticrm/presentation'
  import { showPopup, closeTooltip } from '@anticrm/ui'
  import { getType } from '../utils'
  import AttachmentPresenter from './AttachmentPresenter.svelte'
  import AttachmentActions from './AttachmentActions.svelte'
  import AudioPlayer from './AudioPlayer.svelte'

  export let value: Attachment
  export let isSaved: boolean = false

  $: type = getType(value.type)
</script>

<div class="flex-row-center">
  {#if type === 'image'}
    <div
      class="content flex-center buttonContainer cursor-pointer"
      on:click={() => {
        closeTooltip()
        showPopup(PDFViewer, { file: value.file, name: value.name, contentType: value.type }, 'right')
      }}
    >
      <img src={getFileUrl(value.file)} alt={value.name} />
      <div class="actions">
        <AttachmentActions attachment={value} {isSaved} />
      </div>
    </div>
  {:else if type === 'audio'}
    <div class="buttonContainer">
      <AudioPlayer {value} />
      <div class="actions">
        <AttachmentActions attachment={value} {isSaved} />
      </div>
    </div>
  {:else if type === 'video'}
    <div class="content buttonContainer flex-center">
      <video controls>
        <source src={getFileUrl(value.file)} type={value.type} />
        <track kind="captions" label={value.name} />
        <div class="container">
          <AttachmentPresenter {value} />
        </div>
      </video>
      <div class="actions">
        <AttachmentActions attachment={value} {isSaved} />
      </div>
    </div>
  {:else}
    <div class="flex container buttonContainer">
      <AttachmentPresenter {value} />
      <div class="actions">
        <AttachmentActions attachment={value} {isSaved} />
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .container {
    background-color: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 0.75rem;
    padding: 0.5rem;
  }

  .buttonContainer {
    align-items: flex-start;
    .actions {
      margin-left: 0.5rem;
      visibility: hidden;
    }
  }

  .buttonContainer:hover {
    .actions {
      visibility: visible;
    }
  }

  .content {
    max-width: 20rem;
    max-height: 20rem;

    img,
    video {
      max-width: 20rem;
      max-height: 20rem;
      border-radius: 0.75rem;
      width: 100%;
      height: 100%;
    }
  }
</style>
