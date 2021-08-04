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
  import CheckBox from './CheckBox.svelte'

  export let label: IntlString
  export let checked: boolean = false
  export let editable: boolean = false

  let text: HTMLElement
  let input: HTMLInputElement
  let onEdit: boolean = false
  let goOut: boolean = false

  $: {
    if (text && input) {
      if (onEdit) {
        text.style.visibility = 'hidden'
        input.style.visibility = 'visible'
        input.focus()
      } else {
        input.style.visibility = 'hidden'
        text.style.visibility = 'visible'
      }
    }
  }

  const findNode = (el: Node, name: string): any => {
    while (el.parentNode !== null) {
      if (el.classList.contains(name)) return el
      el = el.parentNode
    }
    return false
  }
  const waitClick = (event: any): void => {
    if (onEdit) {
      if (!findNode(event.target, 'edit-item')) onEdit = false
    }
  }

  function computeSize(t: EventTarget | null) {
    const target = t as HTMLInputElement
    const value = target.value
    text.innerHTML = label.replaceAll(' ', '&nbsp;')
    target.style.width = text.clientWidth + 12 + 'px'
  }

  onMount(() => {
    computeSize(input)
  })
</script>

<svelte:window on:mousedown={waitClick} />
<div class="checkBox-container">
  <CheckBox bind:checked={checked} />
  <div class="label"
    on:click={() => {
      if (editable) {
        onEdit = true
      }
    }}
  >
    <input bind:this={input} type="text" bind:value={label}
      class="edit-item"
      on:input={(ev) => ev.target && computeSize(ev.target)}
    />
    <div class="text" class:checked bind:this={text}>{label}</div>
  </div>
</div>

<style lang="scss">
  .checkBox-container {
    display: flex;
    align-items: center;

    .label {
      position: relative;
      margin-left: 16px;
      color: var(--theme-caption-color);
      &.onEdit {
        margin: 2px 0px 1px 17px;
        text-decoration: none;
      }

      .edit-item {
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
      .text {
        position: absolute;
        top: 0;
        left: 0;

        &.checked {
          text-decoration: line-through;
          color: var(--theme-content-dark-color);
        }
      }
    }
  }
</style>
