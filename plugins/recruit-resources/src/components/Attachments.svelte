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
  import { CircleButton, IconAdd } from '@anticrm/ui'

  import type { Doc, Ref, Space } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import type { Attachment } from '@anticrm/chunter'

  import chunter from '@anticrm/chunter'

  export let object: Doc
  export let space: Ref<Space>

  let files: Attachment[] = [{ name: 'Application description.pdf', type: 'PDF / 2,5 MB' }, { name: 'Application description.pdf', type: 'PDF / 2,5 MB' }]

  console.log('query space', space)

  const query = createQuery()
  // $: query.query(chunter.class.Attachment, { space }, result => { files = result})

</script>

<div class="attachments-container">
  <div class="flex-row-center">
    <span class="title">Attachments</span>
    <CircleButton icon={IconAdd} size={'small'} />
  </div>
  <table class="table-body">
    <thead>
      <tr class="tr-head">
        <th>Attachments (2)</th>
        <th>Time</th>
      </tr>
    </thead>
    <tbody>
      {#each files as file}
        <tr class="tr-body">
          <td class="item flex-row-center">
            <div class="flex-center file-icon">pdf</div>
            <div class="flex-col flex-grow">
              <div class="overflow-label caption-color">{file.name}</div>
              <div class="overflow-label file-desc">{file.type}</div>
            </div>
          </td>
          <td>10 / 8</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style lang="scss">
  .attachments-container {
    display: flex;
    flex-direction: column;

    .title {
      margin-right: .75rem;
      font-weight: 500;
      font-size: 1.25rem;
      color: var(--theme-caption-color);
    }
  }

  .table-body {
    margin-top: .75rem;

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
    .tr-body { border-top: 1px solid var(--theme-button-border-hovered); }
  }

  .item {
    display: flex;
    align-items: center;
    padding: .75rem 1rem;
  }
  .file-icon {
    margin-right: 1.25rem;
    width: 2rem;
    height: 2rem;
    border-radius: .5rem;
  }
  .file-icon {
    font-weight: 500;
    font-size: 0.625rem;
    line-height: 150%;
    text-transform: uppercase;
    color: #fff;
    background-color: var(--primary-button-enabled);
    border: 1px solid rgba(0, 0, 0, .1);
  }
  .file-desc {
    font-size: 0.75rem;
    color: var(--theme-content-dark-color);
  }
</style>