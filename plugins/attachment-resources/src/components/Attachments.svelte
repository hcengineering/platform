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
  import { Class, Doc, Ref, Space } from '@anticrm/core'

  import { Label, Spinner } from '@anticrm/ui'
  import { Table } from '@anticrm/view-resources'
  import attachment from '../plugin'
  import AddAttachment from './AddAttachment.svelte'
  import AttachmentDroppable from './AttachmentDroppable.svelte'

  import UploadDuo from './icons/UploadDuo.svelte'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>

  export let attachments: number | undefined = undefined

  let inputFile: HTMLInputElement
  let loading = 0
  let dragover = false

</script>

<div class="attachments-container">
  <div class="flex-row-center">
    <span class="title"><Label label={attachment.string.Attachments} /></span>
    {#if loading}
      <Spinner />
    {:else}
      <AddAttachment bind:loading bind:inputFile objectClass={_class} {objectId} {space} />
    {/if}
  </div>

  {#if attachments === 0 && !loading}
    <AttachmentDroppable bind:loading bind:dragover objectClass={_class} {objectId} {space}>
      <div class="flex-col-center mt-5 zone-container" class:solid={dragover}>
        <UploadDuo size={'large'} />
        <div class="text-sm content-dark-color mt-2" style:pointer-events="none">
          <Label label={attachment.string.NoAttachments} />
        </div>
        <div class="text-sm" style:pointer-events={dragover ? 'none' : 'all'}>
          <div class="over-underline" on:click={() => inputFile.click()}>
            <Label label={attachment.string.UploadDropFilesHere} />
          </div>
        </div>
      </div>
    </AttachmentDroppable>
  {:else}
    <Table
      _class={attachment.class.Attachment}
      config={['', 'lastModified']}
      options={{}}
      query={{ attachedTo: objectId }}
      loadingProps={{ length: attachments ?? 0 }} />
  {/if}
</div>

<style lang="scss">
  .attachments-container {
    display: flex;
    flex-direction: column;

    .title {
      margin-right: 0.75rem;
      font-weight: 500;
      font-size: 1.25rem;
      color: var(--theme-caption-color);
    }
  }

  .zone-container {
    padding: 1rem;
    color: var(--theme-caption-color);
    background: var(--theme-bg-accent-color);
    border: 1px dashed var(--theme-zone-border-lite);
    border-radius: 0.75rem;
    &.solid {
      border-style: solid;
    }
  }

</style>
