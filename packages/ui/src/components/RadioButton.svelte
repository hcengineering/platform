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
  export let labelSize: 'medium' | 'large' = 'medium'
  export let labelIntl: IntlString | undefined = undefined
  export let labelParams: Record<string, any> | undefined = undefined
  export let action: (() => void) | (() => Promise<void>) = () => {}
  export let gap: 'large' | 'small' | 'medium' | 'none' = 'none'
  export let labelGap: 'large' | 'medium' = 'medium'
  export let kind: 'primary' | 'positive' | 'negative' | 'default' = 'default'
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="antiRadio gap-{gap}"
  class:disabled
  class:checked={group === value}
  class:kind-primary={kind === 'primary'}
  class:kind-positive={kind === 'positive'}
  class:kind-negative={kind === 'negative'}
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
  <div class="marker" />
  <label for={id} class="{labelSize} gap-{labelGap}" class:overflow-label={labelOverflow}>
    <slot>
      {#if labelIntl}
        <Label label={labelIntl} params={labelParams} />
      {:else}
        {label ?? ''}
      {/if}
    </slot>
  </label>
</div>
