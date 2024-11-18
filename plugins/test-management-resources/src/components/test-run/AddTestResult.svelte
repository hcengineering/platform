<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { Attachment } from '@hcengineering/attachment'
  import { AttachmentPresenter, AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import { TestCase, TestProject, TestCaseStatus } from '@hcengineering/test-management'
  import core, { fillDefaults, generateId, makeCollaborativeDoc, Ref, TxOperations, Data } from '@hcengineering/core'
  import { Card, SpaceSelector, getClient } from '@hcengineering/presentation'
  import { EmptyMarkup } from '@hcengineering/text'
  import { Button, createFocusManager, EditBox, FocusHandler, IconAttachment } from '@hcengineering/ui'

  import ProjectPresenter from '../project/ProjectPresenter.svelte'
  import testManagement from '../../plugin'

  export let onCreate: ((orgId: Ref<TestCase>, client: TxOperations) => Promise<void>) | undefined = undefined

  export function canClose (): boolean {
    return object.name === ''
  }

  export let space: Ref<TestProject>


  const id: Ref<TestCase> = generateId()

  const object: Data<TestCase> = {
    name: '',
    description: makeCollaborativeDoc(id, 'description'),
    status: TestCaseStatus.Draft,
    assignee: null,
    attachments: 0,
    //attachedTo: testSuiteId
  } as unknown as TestCase

  let _space = space

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let description = EmptyMarkup

  fillDefaults(hierarchy, object, testManagement.class.TestCase)

  const manager = createFocusManager()

  let descriptionBox: AttachmentStyledBox
  let attachments: Map<Ref<Attachment>, Attachment> = new Map<Ref<Attachment>, Attachment>()
</script>

<FocusHandler {manager} />

<Card
  label={testManagement.string.CreateTestCase}
  okAction={() => {}}
  hideAttachments={attachments.size === 0}
  canSave={object.name.length > 0}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="header">
    <SpaceSelector
      _class={testManagement.class.TestProject}
      label={testManagement.string.TestProject}
      bind:space={_space}
      kind={'regular'}
      size={'small'}
      component={ProjectPresenter}
      defaultIcon={testManagement.icon.Home}
    />
  </svelte:fragment>

  <div class="flex-row-center clear-mins mb-3">
    <EditBox
      bind:value={object.name}
      placeholder={testManagement.string.TestNamePlaceholder}
      kind={'large-style'}
      autoFocus
    />
  </div>

  <AttachmentStyledBox
    bind:this={descriptionBox}
    objectId={id}
    _class={testManagement.class.TestCase}
    space={_space}
    alwaysEdit
    showButtons={false}
    bind:content={description}
    placeholder={core.string.Description}
    kind="indented"
    isScrollable={false}
    enableBackReferences={true}
    enableAttachments={false}
    on:attachments={(ev) => {
      if (ev.detail.size > 0) attachments = ev.detail.values
      else if (ev.detail.size === 0 && ev.detail.values != null) {
        attachments.clear()
        attachments = attachments
      }
    }}
  />

  <svelte:fragment slot="attachments">
    {#if attachments.size > 0}
      {#each Array.from(attachments.values()) as attachment}
        <AttachmentPresenter
          value={attachment}
          showPreview
          removable
          on:remove={(result) => {
            if (result.detail !== undefined) descriptionBox.removeAttachmentById(result.detail._id)
          }}
        />
      {/each}
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="footer">
    <Button
      icon={IconAttachment}
      size="large"
      on:click={() => {
        descriptionBox.handleAttach()
      }}
    />
  </svelte:fragment>
</Card>
