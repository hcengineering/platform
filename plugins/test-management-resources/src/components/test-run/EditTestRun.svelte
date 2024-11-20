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

  import { createQuery, getClient } from '@hcengineering/presentation'
  import { type Class, type Ref } from '@hcengineering/core'
  import { TestRun, TestCase, TestProject } from '@hcengineering/test-management'
  import { Panel } from '@hcengineering/panel'
  import { SplitView } from '@hcengineering/view-resources'
  import { Scroller } from '@hcengineering/ui'

  import { currentTestCase } from './store/testRunStore'
  import { getTestCases } from '../../testRunUtils'
  import testManagement from '../../plugin'
  import AddTestResult from './AddTestResult.svelte'
  import TestRunItemList from './TestRunItemList.svelte'
  import ViewContainer from './ViewContainer.svelte'
  import TestCaseDetails from '../test-case/TestCaseDetails.svelte'

  export let _id: Ref<TestRun>
  export let _class: Ref<Class<TestRun>>
  export let space: Ref<TestProject>

  let object: TestRun | undefined
  let testCases: TestCase[] | undefined

  const dispatch = createEventDispatcher()
  const client = getClient()

  const oldLabel: string | undefined = ''

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
          <ViewContainer header={testManagement.string.SelectTestCase}>
            <TestRunItemList />
          </ViewContainer>
        </div>
      </svelte:fragment>
      <svelte:fragment slot="rightPanel">
        <ViewContainer header={testManagement.string.TestDescription}>
          <Scroller padding={'1rem'}>
            {#if $currentTestCase !== undefined}
              <TestCaseDetails _id={$currentTestCase} _class={testManagement.class.TestCase} />
            {/if}
          </Scroller>
        </ViewContainer>
      </svelte:fragment>
    </SplitView>
    <svelte:fragment slot="aside">
      <ViewContainer header={testManagement.string.TestResult}>
        <div class="antiPanel-wrap__content">
          <AddTestResult {space} />
        </div>
      </ViewContainer>
    </svelte:fragment>
  </Panel>
{/if}
