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
  import type { IntlString } from '@anticrm/platform'
  import Label from './Label.svelte'

  export let label: IntlString | undefined
  export let width: string | undefined
  export let value: string | undefined
  export let placeholder: string = 'placeholder'
  export let password: boolean = false
  export let focus: boolean = false

  let text: HTMLElement
  let input: HTMLInputElement

  function computeSize(t: EventTarget | null) {
    const target = t as HTMLInputElement
    const value = target.value
    text.innerHTML = (value === '' ? placeholder : value).replaceAll(' ', '&nbsp;')
    target.style.width = text.clientWidth + 'px'
  }

  onMount(() => {
    if (focus) {
      input.focus()
      focus = false
    }
    computeSize(input)
  })
</script>

<div class="container" style="{width ? 'width: ' + width : ''}"
  on:click={() => { input.focus() }}
>
  <div class="hidden-text" bind:this={text}></div>
  {#if label}<div class="label"><Label label={label}/></div>{/if}
  <div class="wrap">
    {#if password}
      <input bind:this={input} type="password" bind:value {placeholder} on:input={(ev) => ev.target && computeSize(ev.target)} />
    {:else}
      <input bind:this={input} type="text" bind:value {placeholder} on:input={(ev) => ev.target && computeSize(ev.target)} />
    {/if}
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
      width: 8px;
      height: 8px;
      background-color: transparent;
    }
    &::before {
      top: -3px;
      left: -3px;
      background: linear-gradient(135deg, white 0%, var(--primary-button-enabled) 10%, rgba(68, 116, 246, 0) 50%);
      clip-path: path('M0,8v-8h8v1h-7v1z');
    }
    &::after {
      bottom: -3px;
      right: -3px;
      background: linear-gradient(-45deg, white 0%, var(--primary-button-enabled) 10%, rgba(68, 116, 246, 0) 50%);
      clip-path: path('M0,8h8v-8h-1v7h-7z');
    }
    &:focus-within::before, &:focus-within::after {
      content: '';
    }
  }

  .label {
    margin-bottom: .25rem;
    font-size: .75rem;
    font-weight: 500;
    color: var(--theme-caption-color);
    opacity: .8;
    pointer-events: none;
    user-select: none;
  }

  input {
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 2px;

    &::placeholder {
      color: var(--theme-content-dark-color);
    }

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