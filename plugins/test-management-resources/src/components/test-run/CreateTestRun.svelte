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
  import { AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import core, { Data, DocumentQuery, Ref, generateId, makeCollabId } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { Card, SpaceSelector, createMarkup, createQuery, getClient } from '@hcengineering/presentation'
  import {
    TestCase,
    TestRun,
    TestProject,
    TestResult,
    TestRunStatus,
    TestManagementEvents
  } from '@hcengineering/test-management'
  import { DatePresenter, EditBox, Loading, navigate } from '@hcengineering/ui'
  import { EmptyMarkup, isEmptyMarkup } from '@hcengineering/text'
  import { Analytics } from '@hcengineering/analytics'

  import { getTestRunsLink } from '../../navigation'
  import testManagement from '../../plugin'
  import ProjectPresenter from '../project/ProjectSpacePresenter.svelte'
  import TestCaseSelector from '../test-case/TestCaseSelector.svelte'

  export let space: Ref<TestProject>
  export let query: DocumentQuery<TestCase> = {}
  export let selectedDocs: TestCase[]
  const dispatch = createEventDispatcher()
  const client = getClient()

  let isLoading = selectedDocs === undefined

  if (selectedDocs === undefined) {
    const client = createQuery()
    const spaceQuery = space !== undefined ? { space } : {}
    client.query(testManagement.class.TestCase, { ...spaceQuery, ...(query ?? {}) }, (result) => {
      selectedDocs = result
      isLoading = false
    })
  }

  const id: Ref<TestRun> = generateId()

  const object: Data<TestRun> = {
    name: '' as IntlString,
    description: null,
    dueDate: undefined
  }

  let _space = space

  let description = EmptyMarkup

  let descriptionBox: AttachmentStyledBox
  let attachments: Map<Ref<Attachment>, Attachment> = new Map<Ref<Attachment>, Attachment>()

  async function onSave (): Promise<void> {
    try {
      const applyOp = client.apply()
      await applyOp.createDoc(testManagement.class.TestRun, _space, object, id)
      const testCasesArray = selectedDocs instanceof Array ? selectedDocs : [selectedDocs]
      const createPromises = testCasesArray.map(async (testCase) => {
        const descriptionRef = isEmptyMarkup(description)
          ? null
          : await createMarkup(makeCollabId(testManagement.class.TestRun, id, 'description'), description)

        const testResultId: Ref<TestResult> = generateId()
        const testResultData: Data<TestResult> = {
          attachedTo: id,
          attachedToClass: testManagement.class.TestRun,
          name: testCase.name,
          testCase: testCase._id,
          testSuite: testCase.attachedTo,
          collection: 'results',
          description: descriptionRef,
          status: TestRunStatus.Untested
        }

        return await applyOp.addCollection(
          testManagement.class.TestResult,
          _space,
          id,
          testManagement.class.TestRun,
          'results',
          testResultData,
          testResultId
        )
      })
      await Promise.all(createPromises)
      const opResult = await applyOp.commit()
      if (!opResult.result) {
        throw new Error('Failed to create test run')
      } else {
        Analytics.handleEvent(TestManagementEvents.TestRunCreated, { id })
        navigate(getTestRunsLink(id))
      }
    } catch (err: any) {
      console.error(err)
      Analytics.handleError(err)
    }
  }
</script>

<Card
  label={testManagement.string.CreateTestRun}
  okAction={onSave}
  canSave={object.name !== '' && !isLoading}
  okLabel={testManagement.string.CreateTestRun}
  gap={'gapV-4'}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <svelte:fragment slot="header">
    <SpaceSelector
      _class={testManagement.class.TestProject}
      label={testManagement.string.TestProject}
      bind:space={_space}
      kind={'regular'}
      size={'large'}
      component={ProjectPresenter}
      defaultIcon={testManagement.icon.Home}
    />
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
  <svelte:fragment slot="pool">
    <div id="duedate-editor">
      <DatePresenter
        focusIndex={10}
        bind:value={object.dueDate}
        labelNull={testManagement.string.DueDate}
        kind={'regular'}
        size={'large'}
        editable
      />
    </div>
    <div id="test-cases-selector">
      {#if isLoading}
        <Loading />
      {:else}
        <TestCaseSelector objects={selectedDocs} selectedObjects={selectedDocs} readonly={true} />
      {/if}
    </div>
  </svelte:fragment>
</Card>
