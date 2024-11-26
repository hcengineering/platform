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
  import { TestCase, TestProject, TestResult } from '@hcengineering/test-management'
  import core, { fillDefaults, generateId, makeCollaborativeDoc, Ref, TxOperations, Data } from '@hcengineering/core'
  import { Card, AttributeEditor, getClient } from '@hcengineering/presentation'
  import { EmptyMarkup } from '@hcengineering/text'
  import { Button, createFocusManager, Label, FocusHandler, IconAttachment } from '@hcengineering/ui'
  import { selectedTestRun } from './store/testRunStore'

  import testManagement from '../../plugin'
  import TestResultStatusEditor from '../test-result/TestResultStatusEditor.svelte'

  export let onCreate: ((orgId: Ref<TestCase>, client: TxOperations) => Promise<void>) | undefined = undefined

  export let space: Ref<TestProject>

  const id: Ref<TestResult> = generateId()

  const object: Data<TestResult> = {
    description: makeCollaborativeDoc(id, 'description'),
    attachments: 0,
    status: undefined
    // attachedTo: testSuiteId
  } as unknown as TestResult

  const _space = space

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

<div class="resultPanel">
  <div class="separator" />
  <div class="editor">
    <div class="popupPanel-body__aside-grid">
      <span class="labelOnPanel">
        <Label label={testManagement.string.TestStatus} />
      </span>
      <TestResultStatusEditor value={$selectedTestRun?.status} object={$selectedTestRun} />
    </div>
  </div>
  <div class="divider" />
  <div class="item">
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
  </div>

  <div class="item">
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
  </div>

  <div class="item">
    <Button
      icon={IconAttachment}
      size="large"
      on:click={() => {
        descriptionBox.handleAttach()
      }}
    />
  </div>
  <div class="footer">
    <Button
      label={testManagement.string.Save}
      kind={'primary'}
      on:click={() => {
        dispatch('close')
      }}
    />
    <div class="mr-4" />
    <Button
      label={testManagement.string.SaveAndNext}
      on:click={() => {
        dispatch('close')
      }}
    />
  </div>
</div>

<style lang="scss">
  .resultPanel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    .item {
      justify-content: start;
      padding: 0.75rem;
    }
    .editor {
      padding: 0.75rem 0;
      justify-content: start;
      margin: -0.5rem;
    }
    .divider {
      border-bottom: 1px solid var(--theme-divider-color);
      width: 100%;
    }

    .footer {
      border-top: 1px solid var(--theme-divider-color);
      padding-top: 0.75rem;
      margin-top: auto;
      width: 100%;
      display: flex;
      justify-content: space-around;
    }
  }
</style>
