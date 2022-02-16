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
  import type { AnySvelteComponent } from '../types'
  import Icon from './Icon.svelte'
  import IconClose from './icons/Close.svelte'
  import plugin from '../plugin'

  export let icon: Asset | AnySvelteComponent
  export let width: string | undefined = undefined
  export let value: string | undefined = undefined
  export let placeholder: IntlString = plugin.string.EditBoxPlaceholder
  export let focus: boolean = false

  const dispatch = createEventDispatcher()
  let textHTML: HTMLInputElement
  let phTraslate: string = ''

  $: translate(placeholder, {}).then(res => { phTraslate = res })
  $: if (textHTML !== undefined) {
    if (focus) {
      textHTML.focus()
      focus = false
    }
  }
</script>

<div class="flex-between editbox" style={width ? 'width: ' + width : ''} on:click={() => textHTML.focus()}>
  <div class="mr-2"><Icon {icon} size={'small'} /></div>
  <input bind:this={textHTML} type="text" bind:value placeholder={phTraslate} on:change on:input on:keydown/>
  <slot name='extra'/>
  {#if value}
    <div class="ml-2 btn" on:click={() => { value = ''; dispatch('change', '') }}>
      <Icon icon={IconClose} size={'x-small'} />
    </div>
  {/if}
</div>

<style lang="scss">
  .editbox {
    padding: 0 1rem;
    min-width: 16.75rem;
    height: 2.5rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-enabled);
    border: 1px solid var(--theme-bg-accent-hover);
    border-radius: .75rem;

    &:focus-within { border-color: var(--theme-content-trans-color); }

    input {
      width: 100%;
      border: none;
      border-radius: .5rem;

      &::placeholder { color: var(--theme-content-accent-color); }
    }

    .btn {
      color: var(--theme-content-color);
      cursor: pointer;
      &:hover { color: var(--theme-caption-color); }
    }
  }
</style>
