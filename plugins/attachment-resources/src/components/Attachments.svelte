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
  import { Class, Doc, DocumentQuery, Ref, Space } from '@hcengineering/core'
  import { Icon, Label, Spinner } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { Table } from '@hcengineering/view-resources'
  import attachment from '../plugin'
  import AddAttachment from './AddAttachment.svelte'
  import AttachmentDroppable from './AttachmentDroppable.svelte'
  import IconAttachment from './icons/Attachment.svelte'
  import UploadDuo from './icons/UploadDuo.svelte'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc> = {}

  export let attachments: number | undefined = undefined

  let inputFile: HTMLInputElement
  let loading = 0
  let dragover = false
</script>

<div class="antiSection">
  <div class="antiSection-header">
    <div class="antiSection-header__icon">
      <Icon icon={IconAttachment} size={'small'} />
    </div>
    <span class="antiSection-header__title"><Label label={attachment.string.Attachments} /></span>
    <div class="buttons-group small-gap">
      {#if loading}
        <Spinner />
      {:else}
        <AddAttachment bind:loading bind:inputFile objectClass={_class} {objectId} {space} />
      {/if}
    </div>
  </div>

  {#if !loading && (attachments === null || attachments === 0)}
    <AttachmentDroppable bind:loading bind:dragover objectClass={_class} {objectId} {space}>
      <div class="antiSection-empty attachments flex-col mt-3" class:solid={dragover}>
        <div class="flex-center content-accent-color">
          <UploadDuo size={'large'} />
        </div>
        <div class="text-sm dark-color" style:pointer-events="none">
          <Label label={attachment.string.NoAttachments} />
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="over-underline text-sm content-accent-color"
          style:pointer-events={dragover ? 'none' : 'all'}
          on:click={() => inputFile.click()}
        >
          <Label label={attachment.string.UploadDropFilesHere} />
        </div>
      </div>
    </AttachmentDroppable>
  {:else}
    <Table
      _class={attachment.class.Attachment}
      config={[
        '',
        'description',
        {
          key: 'pinned',
          presenter: view.component.BooleanTruePresenter,
          label: attachment.string.Pinned,
          sortingKey: 'pinned'
        },
        'lastModified'
      ]}
      options={{ sort: { pinned: -1 } }}
      query={{ ...query, attachedTo: objectId }}
      loadingProps={{ length: attachments ?? 0 }}
      on:content={(evt) => {
        attachments = evt.detail.length
      }}
    />
  {/if}
</div>
