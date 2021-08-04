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
    target.style.width = text.clientWidth + 6 + 'px'
  }

  onMount(() => {
    if (focus) {
      input.focus()
      focus = false
    }
    computeSize(input)
  })
</script>

<div class="editbox" style="{width ? 'width: ' + width : ''}"
  on:click={() => { input.focus() }}
>
  <div class="text" bind:this={text}></div>
  {#if label}<div class="label"><Label label={label}/></div>{/if}
  {#if password}
    <input bind:this={input} type="password" bind:value {placeholder} on:input={(ev) => ev.target && computeSize(ev.target)} />
  {:else}
    <input bind:this={input} type="text" bind:value {placeholder} on:input={(ev) => ev.target && computeSize(ev.target)} />
  {/if}
</div>

<style lang="scss">

  .text {
    position: absolute;
    visibility: hidden;
  }
  .editbox {
    display: flex;
    flex-direction: column;
    min-width: 50px;
    height: auto;

    .label {
      margin-bottom: 4px;
      font-size: 12px;
      font-weight: 500;
      color: var(--theme-caption-color);
      opacity: .8;
      pointer-events: none;
      user-select: none;
    }

    input {
      max-width: 100%;
      height: 21px;
      margin: -3px;
      padding: 2px;
      font-family: inherit;
      font-size: 14px;
      line-height: 150%;
      color: var(--theme-caption-color);
      background-color: transparent;
      border: 1px solid transparent;
      border-radius: 2px;
      outline: none;

      &:focus {
        border-color: var(--primary-button-enabled);
      }
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
  }
</style>
