<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import { IntlString } from '@anticrm/platform'

  import DropdownLabelsPopup from './DropdownLabelsPopup.svelte'
  import Label from './Label.svelte'
  import IconUp from './icons/Up.svelte'
  import IconDown from './icons/Down.svelte'

  import type { DropdownTextItem } from '../types'
  import { showPopup } from '..'
  import { createEventDispatcher } from 'svelte'
  import ui from '../plugin'

  export let label: IntlString
  export let placeholder: IntlString | undefined = undefined
  export let items: DropdownTextItem[]
  export let selected: DropdownTextItem['id'] | undefined = undefined

  let btn: HTMLElement
  let opened: boolean = false
  let isDisabled = false
  $: isDisabled = items.length === 0

  let selectedItem = items.find((x) => x.id === selected)
  $: selectedItem = items.find((x) => x.id === selected)
  $: if (selected === undefined && items[0] !== undefined) {
    selected = items[0].id
  }

  const dispatch = createEventDispatcher()
  const none = ui.string.None
</script>

<div class="flex-col cursor-pointer"
  bind:this={btn}
  on:click|preventDefault={() => {
    if (!opened) {
      opened = true
      showPopup(DropdownLabelsPopup, { placeholder, items, selected }, btn, (result) => {
        if (result) {
          selected = result
          dispatch('selected', result)
        }
        opened = false
      })
    }
  }}
>
  <div class="overflow-label label"><Label label={label} /></div>
  <div class="flex-row-center space">
    <span class="mr-1">
      {#if opened}
        <IconUp size={'small'} />
      {:else}
        <IconDown size={'small'} />
      {/if}
    </span>
    <span class="overflow-label" class:caption-color={selected} class:content-dark-color={!selected}>
      {#if selectedItem}
        {selectedItem.label}
      {:else}
        <Label label={none} />
      {/if}
    </span>
  </div>
</div>

<style lang="scss">
  .label {
    margin-bottom: .125rem;
    font-weight: 500;
    font-size: .75rem;
    color: var(--theme-content-accent-color);
  }
</style>
