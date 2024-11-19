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
  import { type Class, type Ref } from '@hcengineering/core'
  import { TestRun, TestCase } from '@hcengineering/test-management'
  import { Panel } from '@hcengineering/panel'
  import { EditBox, ListView } from '@hcengineering/ui'
  import { SplitView } from '@hcengineering/view-resources'

  import TestCaseRefPresenter from '../test-case/TestCasePresenter.svelte'
  import { getTestCases } from '../../testRunUtils'
  import testManagement from '../../plugin'

  export let _id: Ref<TestRun>
  export let _class: Ref<Class<TestRun>>

  let object: TestRun | undefined
  let testCases: TestCase[] | undefined

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
  <ActionContext context={{ mode: 'editor' }} />
  <Panel
    {object}
    title={object.name}
    isHeader={false}
    isAside={true}
    isSub={false}
    adaptive={'default'}
    on:open
    on:close={() => dispatch('close')}
  >
    <SplitView>
      <svelte:fragment slot="leftPanel">
        {#if testCases !== undefined}
          <ListView count={testCases.length} kind={'thin'}>
            <svelte:fragment slot="item" let:item>
              {@const doc = testCases[item]}
              <div
                class="ap-menuItem withComp noMargin"
                on:click={() => {
                  // select(doc)
                }}
              >
                <TestCaseRefPresenter disabled value={doc} />
              </div>
            </svelte:fragment>
          </ListView>
        {/if}
      </svelte:fragment>
      <svelte:fragment slot="rightPanel">
        <EditBox
          bind:value={rawLabel}
          placeholder={testManagement.string.NamePlaceholder}
          kind="large-style"
          on:blur={async () => {
            const trimmedLabel = rawLabel?.trim()

            if (trimmedLabel?.length === 0) {
              rawLabel = oldLabel
            } else if (trimmedLabel !== object?.name) {
              await change('name', trimmedLabel ?? '')
            }
          }}
        />

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
      </svelte:fragment>
    </SplitView>
  </Panel>
{/if}
