<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Component } from '@hcengineering/tracker'
  import tracker from '../../plugin'

  export let value: Ref<Component>[]

  const MAX_VISIBLE_COMPONENTS = 3
  const componentsQuery = createQuery()

  let components: Component[] = []

  $: componentsQuery.query(tracker.class.Component, { _id: { $in: value } }, (res) => (components = res))
</script>

<div class="flex-presenter flex-gap-1-5">
  {#each components as component, i}
    {#if value && i < MAX_VISIBLE_COMPONENTS}
      <span title={component.label} class="overflow-label max-w-60">{component.label}</span>
    {/if}
  {/each}
  {#if components.length > MAX_VISIBLE_COMPONENTS}
    <div>
      +{components.length - MAX_VISIBLE_COMPONENTS}
    </div>
  {/if}
</div>
