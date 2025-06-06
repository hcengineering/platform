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
  import { TestCase } from '@hcengineering/test-management'

  import testManagement from '../../plugin'

  export let object: TestCase | undefined = undefined
  export let _id: Ref<TestCase>
  export let _class: Ref<Class<TestCase>>

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const query = createQuery()

  $: _id !== undefined &&
    _class !== undefined &&
    (object === undefined || object._id !== _id) &&
    query.query(_class, { _id }, async (result) => {
      ;[object] = result
    })

  $: descriptionKey = hierarchy.getAttribute(testManagement.class.TestCase, 'description')

  onMount(() => dispatch('open', { ignoreKeys: [] }))
</script>

{#if object}
  <div class="w-full h-full">
    <AttachmentStyleBoxCollabEditor
      focusIndex={30}
      {object}
      key={{ key: 'description', attr: descriptionKey }}
      identifier={object?._id}
      placeholder={testManagement.string.DescriptionPlaceholder}
      readonly
    />
  </div>
{/if}
