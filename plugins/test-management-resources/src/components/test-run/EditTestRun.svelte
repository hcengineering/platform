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

  import { AttachmentStyleBoxCollabEditor } from '@hcengineering/attachment-resources'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { type Class, type Ref } from '@hcengineering/core'
  import { TestRun, TestCase, TestProject } from '@hcengineering/test-management'
  import { Panel } from '@hcengineering/panel'
  import { SplitView } from '@hcengineering/view-resources'

  import { currentTestCase } from './store/testRunStore'
  import { getTestCases } from '../../testRunUtils'
  import testManagement from '../../plugin'
  import AddTestResult from './AddTestResult.svelte'
  import TestRunItemList from './TestRunItemList.svelte'
  import EditTestCase from '../test-case/EditTestCase.svelte'

  export let _id: Ref<TestRun>
  export let _class: Ref<Class<TestRun>>
  export let space: Ref<TestProject>

  let object: TestRun | undefined
  let testCases: TestCase[] | undefined
  const currentTestcase: Ref<TestCase> = $currentTestCase

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let oldLabel: string | undefined = ''
  let rawLabel: string | undefined = ''
  let descriptionBox: AttachmentStyleBoxCollabEditor

  const query = createQuery()

  $: _id !== undefined &&
    _class !== undefined &&
    query.query(_class, { _id }, async (result) => {
      ;[object] = result
    })

  getTestCases(_id).then((result) => {
    testCases = result
    console.log('testCases', testCases)
  })

  async function change<K extends keyof TestRun> (field: K, value: TestRun[K]) {
    if (object !== undefined) {
      await client.update(object, { [field]: value })
    }
  }

  let content: HTMLElement

  $: if (oldLabel !== object?.name) {
    oldLabel = object?.name
    rawLabel = object?.name
  }

  $: descriptionKey = hierarchy.getAttribute(testManagement.class.TestCase, 'description')

  onMount(() => dispatch('open', { ignoreKeys: [] }))
</script>

{#if object}
  <Panel
    {object}
    title={object.name}
    isHeader={false}
    isAside={true}
    isSub={false}
    adaptive={'default'}
    contentClasses="h-full"
    on:open
    on:close={() => dispatch('close')}
  >
    <SplitView>
      <svelte:fragment slot="leftPanel">
        <div class="antiPanel-wrap__content">
          <TestRunItemList />
        </div>
      </svelte:fragment>
      <svelte:fragment slot="rightPanel">
        {#if currentTestcase !== undefined}
          <EditTestCase _id={currentTestcase} />
        {/if}
      </svelte:fragment>
    </SplitView>
    <svelte:fragment slot="custom-attributes">
      <div class="popupPanel-body__aside-grid">
        <div class="divider" />
        <AddTestResult {space} />
      </div>
    </svelte:fragment>
  </Panel>
{/if}
