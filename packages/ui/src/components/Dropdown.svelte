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
  import { onMount } from 'svelte'
  import type { IntlString, Asset } from '@anticrm/platform'

  import Label from './Label.svelte'
  import Icon from './Icon.svelte'
  import { showPopup } from '..'
  import type { AnySvelteComponent, ListItem } from '../types'
  import DropdownPopup from './DropdownPopup.svelte'
  import Add from './icons/Add.svelte'

  import tesla from '../../img/tesla.svg'
  import google from '../../img/google.svg'

  export let icon: Asset | AnySvelteComponent = Add
  export let label: IntlString
  export let placeholder: string
  export let items: ListItem[] = [{ item: tesla, label: 'Tesla' }, { item: google, label: 'Google' }]
  export let selected: ListItem | undefined = undefined
  export let show: boolean = false

  let btn: HTMLElement
  let container: HTMLElement
  let opened: boolean = false

  onMount(() => {
    if (btn && show) {
      btn.click()
      show = false
    }
  })
</script>

<div class="flex-row-center container" bind:this={container}
  on:click|preventDefault={() => {
    btn.focus()
    if (!opened) {
      opened = true
      showPopup(DropdownPopup, { title: label, caption: 'suggested', items }, container, (result) => {
        if (result) selected = result
        opened = false
      })
    }
  }}
>
  <div class="flex-center focused-button btn" class:selected bind:this={btn} tabindex={0} on:focus={() => container.click()}>
    {#if selected}
      <img src={selected.item} alt={selected.label} />
    {:else}
      {#if typeof (icon) === 'string'}
        <Icon {icon} size={'small'} />
      {:else}
        <svelte:component this={icon} size={'small'} />
      {/if}
    {/if}
  </div>

  <div class="selectUser">
    <div class="title"><Label {label} /></div>
    <div class="caption-color" class:empty={selected ? false : true}>
      {#if selected}{selected.label}{:else}<Label label={placeholder} />{/if}
    </div>
  </div>
</div>

<style lang="scss">
  .container { cursor: pointer; }
  .btn {
    flex-shrink: 0;
    width: 2.25rem;
    height: 2.25rem;
    color: var(--theme-caption-color);
    background-color: transparent;
    border: 1px solid var(--theme-card-divider);
    border-radius: .5rem;
    outline: none;
    overflow: hidden;
  }
  .selected {
    border-color: transparent;
    img { max-width: fit-content; }
  }

  .selectUser {
    margin-left: .75rem;
    .title {
      font-size: .75rem;
      font-weight: 500;
      color: var(--theme-content-accent-color);
    }
    .empty { color: var(--theme-content-trans-color); }
  }
</style>
