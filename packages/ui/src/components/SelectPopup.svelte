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
  import type { Asset, IntlString } from '@anticrm/platform'
  import { translate } from '@anticrm/platform'
  import { createEventDispatcher } from 'svelte'
  import { Icon, Label, IconCheck } from '..'

  export let placeholder: IntlString | undefined = undefined
  export let placeholderParam: any | undefined = undefined
  export let searchable: boolean = false
  export let value: Array<{ id: number | string; icon: Asset; label?: IntlString; text?: string; isSelected?: boolean }>
  export let width: 'medium' | 'large' = 'medium'

  let search: string = ''

  let phTraslate: string = ''
  $: if (placeholder) {
    translate(placeholder, placeholderParam ?? {}).then((res) => {
      phTraslate = res
    })
  }

  const dispatch = createEventDispatcher()

  $: hasSelected = value.some((v) => v.isSelected)
</script>

<div class="selectPopup" class:max-width-40={width === 'large'}>
  {#if searchable}
    <div class="header">
      <input type="text" bind:value={search} placeholder={phTraslate} on:input={(ev) => {}} on:change />
    </div>
  {/if}
  <div class="scroll">
    <div class="box">
      {#each value.filter((el) => (el.label ?? el.text ?? '').toLowerCase().includes(search.toLowerCase())) as item}
        <button
          class="menu-item"
          on:click={() => dispatch('close', item.id)}
          on:focus={() => dispatch('update', item)}
          on:mouseover={() => dispatch('update', item)}
        >
          {#if hasSelected}
            <div class="icon">
              {#if item.isSelected}
                <Icon icon={IconCheck} size={'small'} />
              {/if}
            </div>
          {/if}
          <div class="icon"><Icon icon={item.icon} size={'small'} /></div>
          <span class="label">
            {#if item.label}
              <Label label={item.label} />
            {:else if item.text}
              <span>{item.text}</span>
            {/if}
          </span>
        </button>
      {/each}
    </div>
  </div>
</div>
