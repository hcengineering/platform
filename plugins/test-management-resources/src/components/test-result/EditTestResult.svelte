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
  import { ActionContext, createQuery, getClient } from '@hcengineering/presentation'
  import { type Class, type Ref, Doc, Mixin, WithLookup } from '@hcengineering/core'
  import { TestCase, TestResult } from '@hcengineering/test-management'
  import { Panel } from '@hcengineering/panel'
  import { Label, Scroller } from '@hcengineering/ui'
  import { DocAttributeBar, getDocMixins } from '@hcengineering/view-resources'

  import RightHeader from './RightHeader.svelte'
  import NextButton from './NextButton.svelte'
  import TestCaseDetails from '../test-case/TestCaseDetails.svelte'
  import testManagement from '../../plugin'

  export let _id: Ref<TestResult>
  export let _class: Ref<Class<TestResult>>

  let object: WithLookup<TestResult> | undefined

  const testCase = object?.$lookup?.testCase as TestCase | undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let mixins: Mixin<Doc>[] = []
  $: mixins = object ? getDocMixins(object, false) : []

  let descriptionBox: AttachmentStyleBoxCollabEditor

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

  let content: HTMLElement

  $: descriptionKey = hierarchy.getAttribute(testManagement.class.TestResult, 'description')

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
    on:open
    on:close={() => dispatch('close')}
  >
    <div class="space-divider" />
    <div class="w-full mt-6">
      <AttachmentStyleBoxCollabEditor
        focusIndex={30}
        {object}
        key={{ key: 'description', attr: descriptionKey }}
        bind:this={descriptionBox}
        identifier={object?._id}
        placeholder={testManagement.string.DescriptionPlaceholder}
        boundary={content}
      />
    </div>

    <svelte:fragment slot="extra">
      <NextButton {object} />
    </svelte:fragment>

    <svelte:fragment slot="aside">
      <DocAttributeBar {object} {mixins} ignoreKeys={['name']} />
      <RightHeader>
        <Label label={testManagement.string.TestCaseDescription} />
      </RightHeader>
      <Scroller padding={'0.5rem 2rem'}>
        <TestCaseDetails _id={object.testCase} object={testCase} _class={testManagement.class.TestCase} />
      </Scroller>
    </svelte:fragment>
  </Panel>
{/if}
