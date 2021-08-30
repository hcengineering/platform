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
  import { ScrollBox, IconAdd } from '@anticrm/ui'

  import type { Doc, Ref, Space } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import type { Attachment } from '@anticrm/chunter'

  import chunter from '@anticrm/chunter'

  export let object: Doc
  export let space: Ref<Space>

  let files: Attachment[] = []

  console.log('query space', space)

  const query = createQuery()
  $: query.query(chunter.class.Attachment, { space }, result => { files = result})

</script>

<ScrollBox vertical>
  {#each files as file}
    <div class="item flex-row-center">
      <div class="flex-center file-icon">pdf</div>
      <div class="flex-col flex-grow">
        <div class="overflow-label caption-color">{file.name}</div>
        <div class="overflow-label file-desc">{file.type}</div>
      </div>
    </div>
  {/each}
  <div class="item add-file">
    <button class="add-btn focused-button"><IconAdd size={'small'} /></button>
    <div class="caption-color">Add attachment</div>
  </div>
</ScrollBox>

<style lang="scss">
  .item {
    display: flex;
    align-items: center;
    padding: .75rem 1rem;
  }
  .file-icon, .add-btn {
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
    background-color: #7C6FCD;
    border: 1px solid rgba(0, 0, 0, .1);
  }
  .file-desc {
    font-size: 0.75rem;
    color: var(--theme-content-dark-color);
  }
  .item + .add-file, .item + .item { border-top: 1px solid var(--theme-bg-accent-hover); }
</style>