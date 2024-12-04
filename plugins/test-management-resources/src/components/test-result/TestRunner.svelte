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
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  import { ActionContext } from '@hcengineering/presentation'
  import { WithLookup } from '@hcengineering/core'
  import testManagement, { TestResult, TestCase } from '@hcengineering/test-management'
  import { Panel } from '@hcengineering/panel'
  import { Button } from '@hcengineering/ui'

  import { testResultIteratorProvider, testIteratorStore } from './store/testIteratorStore'
  import TestResultAside from './TestResultAside.svelte'
  import TestCaseDetails from '../test-case/TestCaseDetails.svelte'
  import view from '@hcengineering/view'

  const dispatch = createEventDispatcher()

  let object: WithLookup<TestResult> | undefined = undefined
  let testCase: TestCase | undefined = undefined
  let hasNext = false

  const unsubscribe = testIteratorStore.subscribe(() => {
    hasNext = testResultIteratorProvider.getIterator()?.hasNext() ?? false
  })

  onMount(async () => {
    object = testResultIteratorProvider.getIterator()?.next()
    testCase = object?.$lookup?.testCase as TestCase | undefined
  })
  onDestroy(() => {
    testResultIteratorProvider.reset()
    unsubscribe()
  })

  async function goToNextItem (): Promise<void> {
    object = testResultIteratorProvider.getIterator()?.next()
    testCase = object?.$lookup?.testCase as TestCase | undefined
  }
</script>

<ActionContext context={{ mode: 'editor' }} />
{#if object !== undefined}
  <Panel
    {object}
    title={object?.name}
    isHeader={false}
    isAside={true}
    isSub={false}
    adaptive={'default'}
    withoutActivity
    on:open
    on:close={() => dispatch('close')}
  >
    <svelte:fragment slot="extra">
      <Button
        label={testManagement.string.GoToNextTest}
        kind={'primary'}
        icon={view.icon.ArrowRight}
        disabled={!hasNext}
        on:click={goToNextItem}
        showTooltip={{ label: testManagement.string.GoToNextTestTooltip }}
      />
    </svelte:fragment>
    <TestCaseDetails _id={object.testCase} object={testCase} _class={testManagement.class.TestCase} />

    <svelte:fragment slot="aside">
      <TestResultAside {object} />
    </svelte:fragment>
  </Panel>
{/if}
