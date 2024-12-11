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
  import { createEventDispatcher, onMount } from 'svelte'

  import { Analytics } from '@hcengineering/analytics'
  import { AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import { ActionContext, getClient } from '@hcengineering/presentation'
  import core, { Data, Ref, generateId } from '@hcengineering/core'
  import testManagement, { TestProject, TestPlan, TestCase, TestPlanItem, TestManagementEvents } from '@hcengineering/test-management'
  import { Panel } from '@hcengineering/panel'
  import { ModernButton, EditBox, Label } from '@hcengineering/ui'
  import { EmptyMarkup } from '@hcengineering/text'
  import { IntlString } from '@hcengineering/platform'
  import { Attachment } from '@hcengineering/attachment'

  import NewTestPlanAside from './NewTestPlanAside.svelte'
  import TestCaseSelector from '../test-case/TestCaseSelector.svelte'
  import { getProjectFromLocation } from '../../navigation'

  export let space: Ref<TestProject> = getProjectFromLocation()
  export let testCases: TestCase[] = []

  const id: Ref<TestPlan> = generateId()

  const object: Data<TestPlan> = {
    name: '' as IntlString,
    description: null
  }

  const dispatch = createEventDispatcher()
  const client = getClient()

  let description = EmptyMarkup
  let descriptionBox: AttachmentStyledBox
  let attachments: Map<Ref<Attachment>, Attachment> = new Map<Ref<Attachment>, Attachment>()

  async function onSave (): Promise<void> {
    try {
      const applyOp = client.apply()
      await applyOp.createDoc(testManagement.class.TestPlan, space, object, id)
      await descriptionBox.createAttachments(id, applyOp)
      const testCasesArray = testCases instanceof Array ? testCases : [testCases]
      const createPromises = testCasesArray.map(async (testCase) => {
        const testPlanItemId: Ref<TestPlanItem> = generateId()
        const testPlanItemData: Data<TestPlanItem> = {
          attachedTo: id,
          attachedToClass: testManagement.class.TestRun,
          testCase: testCase._id,
          testSuite: testCase.attachedTo,
          collection: 'items'
        }

        return await applyOp.addCollection(
          testManagement.class.TestPlanItem,
          space,
          id,
          testManagement.class.TestRun,
          'items',
          testPlanItemData,
          testPlanItemId
        )
      })
      await Promise.all(createPromises)
      const opResult = await applyOp.commit()
      if (!opResult.result) {
        throw new Error('Failed to create test plan')
      } else {
        Analytics.handleEvent(TestManagementEvents.TestPlanCreated, { id })
        dispatch('close')
      }
    } catch (err: any) {
      console.error(err)
      Analytics.handleError(err)
    }
  }

  onMount(() => dispatch('open', { ignoreKeys: [] }))
</script>

{#if object}
  <ActionContext context={{ mode: 'editor' }} />
  <Panel
    {object}
    isHeader={false}
    isAside={true}
    isSub={false}
    adaptive={'default'}
    withoutActivity={true}
    on:open
    on:close={() => dispatch('close')}
  >
    <svelte:fragment slot="title">
      <Label label={testManagement.string.CreateTestRun} />
    </svelte:fragment>
    <EditBox
      bind:value={object.name}
      placeholder={testManagement.string.TestRunNamePlaceholder}
      kind={'large-style'}
      autoFocus
    />

    <AttachmentStyledBox
      bind:this={descriptionBox}
      objectId={id}
      _class={testManagement.class.TestRun}
      {space}
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

    <div class="space-divider"/>
    <div class="flex flex-between">
      <div id="test-cases-selector">
        <TestCaseSelector bind:objects={testCases} />
      </div>
      <ModernButton
        label={testManagement.string.Save}
        size="medium"
        kind={'primary'}
        disabled={object?.name.trim().length === 0 || testCases?.length === 0}
        on:click={onSave}
      />
    </div>
    <svelte:fragment slot="aside">
      <NewTestPlanAside/>
    </svelte:fragment>
  </Panel>
{/if}
