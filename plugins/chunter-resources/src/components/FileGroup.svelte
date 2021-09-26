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
  import type { Bag } from '@anticrm/core'
  import type { Attachment } from '@anticrm/chunter'
  import { IconFile, Link, showPopup } from '@anticrm/ui'
  import { PDFViewer } from '@anticrm/presentation'

  export let files: Bag<Attachment>
</script>

<div class="files-container">
  <span class="icon"><IconFile size={'small'}/></span>
  {Object.values(files).length} files
  <div class="window">
    {#each Object.values(files) as file}
      <div class="flex-row-center file">
        <Link label={file.name} href={'#'} icon={IconFile} on:click={ () => { showPopup(PDFViewer, { file: file.file }, 'right') } }/>
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .files-container {
    position: relative;
    display: flex;
    align-items: center;
    color: var(--theme-content-color);
    cursor: pointer;

    .icon {
      margin-right: .25rem;
      transform-origin: center center;
      transform: scale(.75);
      opacity: .6;
    }
    &:hover {
      color: var(--theme-caption-color);
      .icon { opacity: 1; }
      .window { visibility: visible; }
      &::after { content: ''; }
    }
    &::after {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: -1rem;
    }

    .window {
      visibility: hidden;
      position: absolute;
      display: flex;
      flex-direction: column;
      padding: 1.25rem 1.5rem;
      top: 1.5rem;
      left: 0;
      min-width: 100%;
      background-color: var(--theme-button-bg-focused);
      border: 1px solid var(--theme-button-border-enabled);
      border-radius: .75rem;
      box-shadow: 0 .75rem 1.25rem rgba(0, 0, 0, .2);
      z-index: 1;

      .file + .file { margin-top: .25rem; }
    }
  }
</style>
