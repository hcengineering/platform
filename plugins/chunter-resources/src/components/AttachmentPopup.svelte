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
  import { showPopup, closeTooltip } from '@anticrm/ui'
  import { PDFViewer } from '@anticrm/presentation'

  export let files: Bag<Attachment>

  const maxLenght: number = 32
  const trimFilename = (fname: string): string => (fname.length > maxLenght)
                        ? fname.substr(0, (maxLenght - 1) / 2) + '...' + fname.substr(-(maxLenght - 1) / 2)
                        : fname
</script>

<table class="table-body">
  <tbody>
    {#each Object.values(files) as file}
      <tr class="tr-body">
        <td class="item flex-row-center">
          <div class="flex-center file-icon">pdf</div>
          <div class="flex-col flex-grow" style="cursor: pointer" on:click={() => {
            closeTooltip()
            showPopup(PDFViewer, { file: file.file }, 'right')
          }}>
            <div class="overflow-label caption-color">{trimFilename(file.name)}</div>
            <div class="overflow-label file-desc">{file.type}</div>
          </div>
        </td>
        <td>10 / 8</td>
      </tr>
    {/each}
  </tbody>
</table>

<style lang="scss">
  th, td {
    padding: .75rem 0;
    text-align: left;
  }
  th {
    font-weight: 500;
    font-size: .75rem;
    color: var(--theme-content-dark-color);
  }
  td {
    color: var(--theme-caption-color);
  }
  .tr-body {
    border-top: 1px solid var(--theme-button-border-hovered);
    &:first-child { border-top: none; }
  }

  .item { padding: .75rem 1rem .75rem 0; }
  .file-icon {
    margin-right: 1.25rem;
    width: 2rem;
    height: 2rem;
    font-weight: 500;
    font-size: 0.625rem;
    line-height: 150%;
    text-transform: uppercase;
    color: #fff;
    background-color: var(--primary-button-enabled);
    border: 1px solid rgba(0, 0, 0, .1);
    border-radius: .5rem;
  }
  .file-desc {
    font-size: 0.75rem;
    color: var(--theme-content-dark-color);
  }
</style>
