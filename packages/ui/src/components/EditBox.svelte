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
  import { createEventDispatcher, onMount, afterUpdate } from 'svelte'
  import type { IntlString, Asset } from '@anticrm/platform'
  import type { AnySvelteComponent } from '../types'
  import Label from './Label.svelte'
  import Icon from './Icon.svelte'

  export let label: IntlString | undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let maxWidth: string | undefined
  export let value: string | undefined
  export let placeholder: string = 'placeholder'
  export let password: boolean = false
  export let focus: boolean = false

  const dispatch = createEventDispatcher()

  let text: HTMLElement
  let input: HTMLInputElement
  let style: string

  $: style = maxWidth ? `max-width: ${maxWidth};` : ''

  function computeSize (t: EventTarget | null) {
    const target = t as HTMLInputElement
    const value = target.value
    text.innerHTML = (value === '' ? placeholder : value).replaceAll(' ', '&nbsp;')
    target.style.width = text.clientWidth + 'px'
    dispatch('input')
  }

  onMount(() => {
    if (focus) {
      input.focus()
      focus = false
    }
    computeSize(input)
  })

  afterUpdate(() => {
    computeSize(input)
  })
  

</script>

<div class="container" on:click={() => { input.focus() }}>
  <div class="hidden-text" bind:this={text}></div>
  {#if label}<div class="label"><Label label={label}/></div>{/if}
  <div class="flex-row-center">
    {#if icon}
      <div class="icon">
        {#if typeof (icon) === 'string'}
          <Icon {icon} size={'small'}/>
        {:else}
          <svelte:component this={icon} size={'small'} />
        {/if}
      </div>
    {/if}
    <div class="wrap">
      {#if password}
        <input bind:this={input} type="password" bind:value {placeholder} {style} on:input={(ev) => ev.target && computeSize(ev.target)} on:change/>
      {:else}
        <input bind:this={input} type="text" bind:value {placeholder} {style} on:input={(ev) => ev.target && computeSize(ev.target)} on:change/>
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .container {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .wrap {
    position: relative;

    &::after, &::before {
      position: absolute;
      width: 6px;
      height: 6px;
      background-color: var(--primary-button-enabled);
    }
    &::before {
      top: -2px;
      left: -4px;
      clip-path: path('M0,6v-6h6v1h-5v5z');
    }
    &::after {
      bottom: -2px;
      right: -4px;
      clip-path: path('M0,6h6v-6h-1v5h-5z');
    }
    &:focus-within::before, &:focus-within::after { content: ''; }
  }

  .label {
    margin-bottom: .25rem;
    font-size: .75rem;
    font-weight: 500;
    color: var(--theme-content-accent-color);
    pointer-events: none;
    user-select: none;
  }

  .icon {
    margin-right: .25rem;
    transform-origin: center center;
    transform: scale(.75);
    color: var(--theme-content-trans-color);
  }

  input {
    margin: 0;
    padding: 0;
    color: var(--theme-caption-color);
    border: none;
    border-radius: 2px;

    &::placeholder { color: var(--theme-content-dark-color); }

    &::-webkit-contacts-auto-fill-button,
    &::-webkit-credentials-auto-fill-button {
      visibility: hidden;
      display: none !important;
      pointer-events: none;
      height: 0;
      width: 0;
      margin: 0;
    }
  }
</style>