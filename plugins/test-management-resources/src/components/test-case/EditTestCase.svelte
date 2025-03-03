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
  import { TestCase } from '@hcengineering/test-management'
  import { Panel } from '@hcengineering/panel'
  import { EditBox, Breadcrumb } from '@hcengineering/ui'
  import { DocAttributeBar } from '@hcengineering/view-resources'

  import testManagement from '../../plugin'

  export let _id: Ref<TestCase>
  export let _class: Ref<Class<TestCase>>

  let object: TestCase | undefined

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

  async function change<K extends keyof TestCase> (field: K, value: TestCase[K]) {
    if (object !== undefined) {
      await client.update(object, { [field]: value })
    }
  }

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
    isHeader={false}
    isAside={false}
    isSub={false}
    adaptive={'disabled'}
    on:open
    on:close={() => dispatch('close')}
  >
    <svelte:fragment slot="title">
      <Breadcrumb icon={testManagement.icon.TestCase} title={object.name} size={'large'} isCurrent />
    </svelte:fragment>

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
      />
    </div>

    <svelte:fragment slot="aside">
      <DocAttributeBar {object} ignoreKeys={['name']} />
    </svelte:fragment>
  </Panel>
{/if}
