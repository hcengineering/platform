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
  import type { Asset } from '@anticrm/platform'
  import type { AnySvelteComponent } from '../types'
  import Icon from './Icon.svelte'
  import Tooltip from './Tooltip.svelte'
  import IconClose from './icons/Close.svelte'
  import ui from '../plugin'

  export let icon: Asset | AnySvelteComponent
  export let width: string | undefined = undefined
  export let value: string | undefined = undefined
  export let placeholder: string = 'placeholder'

  let textHTML: HTMLInputElement
</script>

<div class="flex-between editbox" style={width ? 'width: ' + width : ''} on:click={() => textHTML.focus()}>
  <div class="mr-2"><Icon {icon} size={'small'} /></div>
  <input bind:this={textHTML} type="text" bind:value {placeholder} on:change/>
  {#if value}
    <div class="ml-2 btn" on:click={() => { textHTML.value = ''; textHTML.dispatchEvent(new Event('change')) }}>
      <Tooltip label={ui.string.Clear}>
        <div class="scale-75"><Icon icon={IconClose} size={'small'} /></div>
      </Tooltip>
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
