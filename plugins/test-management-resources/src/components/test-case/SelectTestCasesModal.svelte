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
  import { Data, DocumentQuery, Ref, generateId, makeCollabId } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createMarkup, createQuery, getClient } from '@hcengineering/presentation'
  import {
    TestCase,
    TestRun,
    TestProject,
    TestResult,
    TestRunStatus,
    TestManagementEvents
  } from '@hcengineering/test-management'
  import { Button, Dialog, navigate } from '@hcengineering/ui'
  import { EmptyMarkup, isEmptyMarkup } from '@hcengineering/text'
  import { Analytics } from '@hcengineering/analytics'
  import { ComponentNavigator } from '@hcengineering/workbench-resources'
  import view from '@hcengineering/view'

  import { getTestRunsLink } from '../../navigation'
  import testManagement from '../../plugin'
  import TestCasesList from './TestCasesList.svelte'

  export let space: Ref<TestProject>
  export let query: DocumentQuery<TestCase> = {}
  export let testCases: TestCase[]
  const dispatch = createEventDispatcher()
  const client = getClient()

  let isLoading = testCases === undefined

  if (testCases === undefined) {
    const client = createQuery()
    const spaceQuery = space !== undefined ? { space } : {}
    client.query(testManagement.class.TestCase, { ...spaceQuery, ...(query ?? {}) }, (result) => {
      testCases = result
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
      const testCasesArray = testCases instanceof Array ? testCases : [testCases]
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
        navigate(getTestRunsLink(space, id))
      }
    } catch (err: any) {
      console.error(err)
      Analytics.handleError(err)
    }
  }

  function handleClose (): void {
    dispatch('close')
  }
</script>

<Dialog
  isFullSize
  on:fullsize
  on:close={handleClose}
>
  <svelte:fragment slot="title">
    {'Select test cases'}
  </svelte:fragment>
  <ComponentNavigator
    navigationComponent={view.component.FoldersBrowser}
    navigationComponentLabel={testManagement.string.TestSuites}
    navigationComponentIcon={testManagement.icon.TestSuites}
    mainComponentLabel={testManagement.string.TestCases}
    mainComponentIcon={testManagement.icon.TestCases}
    mainComponent={TestCasesList}
    showNavigator={true}
    navigationComponentProps={{
      _class: testManagement.class.TestSuite,
      icon: testManagement.icon.TestSuites,
      title: testManagement.string.TestSuites,
      titleKey: 'name',
      parentKey: 'parent',
      noParentId: testManagement.ids.NoParent,
      getFolderLink: testManagement.function.GetTestSuiteLink,
      allObjectsLabel: testManagement.string.AllTestSuites,
      allObjectsIcon: testManagement.icon.TestSuites
    }}
  />
  <svelte:fragment slot="footerRight">
    <div class="p-2">
      <div class="buttons-group">
        <Button
          kind={'secondary'}
          label={testManagement.string.Cancel}
          on:click={handleClose}
        />
        <Button
          kind={'primary'}
          label={testManagement.string.Save}
        />
      </div>
    </div>
  </svelte:fragment>
</Dialog>
