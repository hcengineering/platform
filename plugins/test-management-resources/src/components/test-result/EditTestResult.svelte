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

  import { ActionContext, createQuery } from '@hcengineering/presentation'
  import { type Class, type Ref, WithLookup } from '@hcengineering/core'
  import { TestCase, TestResult } from '@hcengineering/test-management'
  import { Panel } from '@hcengineering/panel'

  import TestResultAside from './TestResultAside.svelte'
  import TestCaseDetails from '../test-case/TestCaseDetails.svelte'
  import testManagement from '../../plugin'

  export let _id: Ref<TestResult>
  export let _class: Ref<Class<TestResult>>

  let object: WithLookup<TestResult> | undefined

  const testCase = object?.$lookup?.testCase as TestCase | undefined

  const dispatch = createEventDispatcher()

  const query = createQuery()

  $: _id !== undefined &&
    _class !== undefined &&
    query.query(
      _class,
      { _id },
      async (result) => {
        ;[object] = result
      },
      {
        lookup: {
          testCase: testManagement.class.TestCase
        }
      }
    )

  onMount(() => dispatch('open', { ignoreKeys: [] }))
</script>

{#if object}
  <ActionContext context={{ mode: 'editor' }} />
  <Panel
    {object}
    title={testCase?.name ?? object?.name}
    isHeader={false}
    isAside={true}
    isSub={false}
    adaptive={'default'}
    withoutActivity={true}
    on:open
    on:close={() => dispatch('close')}
  >
    <div class="space-divider" />
    <TestCaseDetails _id={object.testCase} object={testCase} _class={testManagement.class.TestCase} />

    <svelte:fragment slot="aside">
      <TestResultAside {object} />
    </svelte:fragment>
  </Panel>
{/if}
