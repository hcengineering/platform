<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import cardPlugin, { Tag } from '@hcengineering/card'
  import { Ref } from '@hcengineering/core'
  import { Process, Step } from '@hcengineering/process'
  import { Label, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import TagSelector from './TagSelector.svelte'

  export let process: Process
  export let step: Step<Tag>

  const params = step.params
  let _id = params._id as Ref<Tag>

  const dispatch = createEventDispatcher()

  function changeTag (e: CustomEvent<{ tag: Ref<Tag> }>): void {
    if (e.detail !== undefined) {
      _id = e.detail.tag
      params._id = _id
      step.params = params
      dispatch('change', step)
    }
  }
</script>

<div class="flex-col flex-gap-2">
  <div class="editor-grid">
    <span
      class="labelOnPanel"
      use:tooltip={{
        props: { label: cardPlugin.string.Tag }
      }}
    >
      <Label label={cardPlugin.string.Tag} />
    </span>
    <TagSelector {process} tag={_id} includeBase on:change={changeTag} />
  </div>
</div>
