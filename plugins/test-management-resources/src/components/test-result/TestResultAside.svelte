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

  import activity from '@hcengineering/activity'
  import { AttachmentStyleBoxCollabEditor } from '@hcengineering/attachment-resources'
  import { getClient } from '@hcengineering/presentation'
  import { Doc, Mixin, WithLookup } from '@hcengineering/core'
  import testManagement, { TestResult } from '@hcengineering/test-management'
  import { DocAttributeBar, getDocMixins } from '@hcengineering/view-resources'

  import { Component, Label } from '@hcengineering/ui'
  import RightHeader from './RightHeader.svelte'

  export let object: WithLookup<TestResult> | undefined
  export let withoutActivity: boolean = false

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let mixins: Mixin<Doc>[] = []
  $: mixins = object !== undefined ? getDocMixins(object, false) : []

  let descriptionBox: AttachmentStyleBoxCollabEditor

  $: descriptionKey = hierarchy.getAttribute(testManagement.class.TestResult, 'description')

  onMount(() => dispatch('open', { ignoreKeys: [] }))
</script>

{#if object}
  <DocAttributeBar {object} {mixins} ignoreKeys={['name']} />
  <RightHeader>
    <Label label={testManagement.string.Comments} />
  </RightHeader>
  <div class="w-full mt-6 px-4">
    <AttachmentStyleBoxCollabEditor
      focusIndex={30}
      {object}
      key={{ key: 'description', attr: descriptionKey }}
      bind:this={descriptionBox}
      identifier={object?._id}
      placeholder={testManagement.string.DescriptionPlaceholder}
    />
  </div>
  {#if !withoutActivity}
    <div class="w-full mt-6 p-4">
      <Component
        is={activity.component.Activity}
        props={{
          object,
          showCommenInput: true,
          focusIndex: 1000
        }}
      />
    </div>
  {/if}
{/if}
