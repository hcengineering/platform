<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { generateId } from '@hcengineering/core'
  import { Label } from '..'

  export let id: string = generateId()
  export let group: any
  export let value: any
  export let disabled: boolean = false
  export let labelOverflow: boolean = false
  export let label: string | undefined = undefined
  export let labelIntl: IntlString | undefined = undefined
  export let labelParams: Record<string, any> | undefined = undefined
  export let action: () => void = () => {}
  export let gap: 'small' | 'medium' | 'none' = 'none'
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="antiRadio gap-{gap}"
  class:disabled
  class:checked={group === value}
  tabindex="-1"
  on:click={() => {
    if (!disabled && group !== value) action()
  }}
>
  <input
    {id}
    type="radio"
    bind:group
    {value}
    {disabled}
    on:click={() => {
      if (!disabled && group !== value) action()
    }}
  />
  <label for={id} class:overflow-label={labelOverflow}>
    <slot />
    {#if labelIntl}
      <Label label={labelIntl} params={labelParams} />
    {:else}
      {label}
    {/if}
  </label>
</div>
