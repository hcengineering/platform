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

  import { DocumentQuery, Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { TestCase, TestProject } from '@hcengineering/test-management'
  import { Button, Dialog, Label } from '@hcengineering/ui'
  import { ComponentNavigator } from '@hcengineering/workbench-resources'
  import view from '@hcengineering/view'
  import { selectionStore } from '@hcengineering/view-resources'

  import TestCasesList from './TestCasesList.svelte'
  import testManagement from '../../plugin'
  import { getProjectFromLocation } from '../../navigation'

  export let space: Ref<TestProject> = getProjectFromLocation()
  export let query: DocumentQuery<TestCase> = {}
  export let testCases: TestCase[]
  export let onSave: (testCases: TestCase[]) => void

  const dispatch = createEventDispatcher()

  let isLoading = testCases === undefined

  if (testCases === undefined) {
    const client = createQuery()
    const spaceQuery = space !== undefined ? { space } : {}
    client.query(testManagement.class.TestCase, { ...spaceQuery, ...(query ?? {}) }, (result) => {
      testCases = result
      isLoading = false
    })
  }

  async function handleSave (): Promise<void> {
    if (onSave !== undefined) {
      const testCases: TestCase[] = ($selectionStore?.docs ?? []) as TestCase[]
      onSave(testCases)
    }
    handleClose()
  }

  function handleClose (): void {
    dispatch('close')
  }
</script>

<Dialog isFullSize on:fullsize on:close={handleClose}>
  <svelte:fragment slot="title">
    <Label label={testManagement.string.SelectTestCases} />
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
      allObjectsLabel: testManagement.string.AllTestSuites,
      allObjectsIcon: testManagement.icon.TestSuites,
      space
    }}
    mainComponentProps={{ space }}
    syncWithLocationQuery={false}
    {space}
  />
  <svelte:fragment slot="footerRight">
    <div class="p-2">
      <div class="buttons-group">
        <Button kind={'secondary'} label={testManagement.string.Cancel} on:click={handleClose} />
        <Button kind={'primary'} label={testManagement.string.Save} on:click={handleSave} />
      </div>
    </div>
  </svelte:fragment>
</Dialog>
