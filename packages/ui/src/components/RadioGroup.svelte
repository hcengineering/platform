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
  import type { RadioItem } from '..'
  import { RadioButton } from '..'

  export let items: RadioItem[]
  export let selected: any | undefined = undefined
  export let disabled: boolean = false
  export let gap: 'small' | 'medium' | 'none' = 'small'
</script>

{#if items && items.length > 0}
  <div class="flex-col">
    {#each items as item, i}
      <RadioButton
        bind:group={selected}
        id={item.id}
        label={item.label}
        labelIntl={item.labelIntl}
        labelParams={item.labelParams}
        value={item.value}
        disabled={disabled ? true : item.disabled}
        action={item.action}
        gap={i < items.length - 1 ? gap : 'none'}
      />
    {/each}
  </div>
{/if}
