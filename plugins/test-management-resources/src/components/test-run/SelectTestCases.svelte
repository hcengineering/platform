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

  import { Modal } from '@hcengineering/ui'
  import { type Ref } from '@hcengineering/core'
  import { TestRun, TestCase, TestProject } from '@hcengineering/test-management'
  import { Panel } from '@hcengineering/panel'
  import { FoldersBrowser, SplitView } from '@hcengineering/view-resources'

  import testManagement from '../../plugin'
  import TestCasesList from './TestCasesList.svelte'

  export let space: Ref<TestProject>

  let testCases: TestCase[] | undefined

  const dispatch = createEventDispatcher()

  onMount(() => dispatch('open', { ignoreKeys: [] }))

  function handleCancel (): void {
    dispatch('close')
  }

  function save (): void {
    dispatch('close')
  }
</script>

<Modal
  label={testManagement.string.testCases}
  type="type-popup"
  okLabel={testManagement.string.Save}
  okAction={save}
  onCancel={handleCancel}
  on:close
>
  <SplitView>
    <svelte:fragment slot="leftPanel">
      <FoldersBrowser
        _class={testManagement.class.TestSuite}
        titleKey={'name'}
        parentKey={'parent'}
        noParentId={testManagement.ids.NoParent}
        getFolderLink={testManagement.function.GetTestSuiteLink}
        allObjectsIcon={testManagement.icon.TestSuite}
        allObjectsLabel={testManagement.string.AllTestCases}
      />
    </svelte:fragment>
    <svelte:fragment slot="rightPanel">
      <TestCasesList />
    </svelte:fragment>
  </SplitView>
</Modal>
