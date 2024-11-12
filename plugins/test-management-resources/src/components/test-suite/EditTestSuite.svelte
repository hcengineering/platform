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
  import { ActionContext, createQuery, getClient } from '@hcengineering/presentation'
  import { type Class, type Ref } from '@hcengineering/core'
  import { TestSuite } from '@hcengineering/test-management'
  import { StyledTextArea } from '@hcengineering/text-editor-resources'
  import { Panel } from '@hcengineering/panel'
  import { EditBox } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'

  import TestCasesList from './TestCasesList.svelte'
  import testManagement from '../../plugin'

  export let _id: Ref<TestSuite>
  export let _class: Ref<Class<TestSuite>>

  let object: TestSuite | undefined

  const dispatch = createEventDispatcher()
  const client = getClient()

  let oldLabel: string | undefined = ''
  let rawLabel: string | undefined = ''

  const query = createQuery()

  $: _id !== undefined &&
    _class !== undefined &&
    query.query(_class, { _id }, async (result) => {
      ;[object] = result
    })

  async function change<K extends keyof TestSuite> (field: K, value: TestSuite[K]) {
    if (object !== undefined) {
      await client.update(object, { [field]: value })
    }
  }

  $: if (oldLabel !== object?.name) {
    oldLabel = object?.name
    rawLabel = object?.name
  }

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
      <StyledTextArea
        bind:content={object.description}
        placeholder={testManagement.string.DescriptionPlaceholder}
        kind={'emphasized'}
        showButtons={false}
      />
    </div>

    <div class="w-full mt-6">
      <TestCasesList objectId={object._id} />
    </div>
  </Panel>
{/if}
