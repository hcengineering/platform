<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { IntlString } from '@hcengineering/platform'

  import Toggle from './Toggle.svelte'
  import Label from './Label.svelte'
  import { createEventDispatcher } from 'svelte'

  export let label: IntlString
  export let description: IntlString | undefined = undefined
  export let on: boolean = false
  export let disabled: boolean = false

  const dispatch = createEventDispatcher()
</script>

<div class="flex-between w-full">
  <div class="caption">
    <Label {label} />
    {#if description}
      <span><Label label={description} /></span>
    {/if}
  </div>
  <Toggle
    bind:on
    {disabled}
    on:change={() => {
      dispatch('change', on)
    }}
  />
</div>

<style lang="scss">
  .caption {
    margin-right: 1rem;
    color: var(--caption-color);
    user-select: none;
    span {
      display: block;
      font-size: 0.75rem;
      color: var(--dark-color);
    }
  }
</style>
