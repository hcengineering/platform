<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import type { IntlString } from '@anticrm/platform'
  import { translate } from '@anticrm/platform'
  import {
    Button,
    IconClose,
    closeTooltip,
    IconBlueCheck,
    registerFocus,
    createFocusManager,
    IconArrowRight,
    IconEdit
  } from '@anticrm/ui'
  import IconCopy from './icons/Copy.svelte'
  import { FocusHandler } from '@anticrm/ui'
  import plugin from '../plugin'

  export let value: string = ''
  export let placeholder: IntlString
  export let editable: boolean | undefined = undefined
  export let openable: boolean = false
  export let trigger: HTMLElement

  const dispatch = createEventDispatcher()
  let input: HTMLInputElement
  let phTraslate: string
  $: translate(placeholder, {}).then((tr) => (phTraslate = tr))
  let label: IntlString = plugin.string.CopyToClipboard
  let lTraslate: string
  $: translate(label, {}).then((tr) => (lTraslate = tr))
  let show: boolean = false

  const copyChannel = (): void => {
    if (label === plugin.string.CopyToClipboard) {
      navigator.clipboard.writeText(value).then(() => (label = plugin.string.Copied))
      setTimeout(() => {
        label = plugin.string.CopyToClipboard
      }, 3000)
    }
  }

  onMount(() => {
    if (input) input.focus()
  })

  const mgr = createFocusManager()

  const { idx } = registerFocus(1, {
    focus: () => {
      input?.focus()
      return true
    },
    isFocus: () => document.activeElement === input
  })

  const updateFocus = () => {
    mgr.setFocus(idx)
  }
  $: if (input) {
    input.addEventListener('focus', updateFocus, { once: true })
  }

  let tHeight: number
  let vertical: 'top' | 'bottom' = 'bottom'
  const fitEditor = (): void => {
    if (trigger) {
      const rect = trigger.getBoundingClientRect()
      if (rect && rect.bottom + tHeight + 29 >= window.innerHeight) vertical = 'top'
      else vertical = 'bottom'
    }
  }
  afterUpdate(() => {
    fitEditor()
  })
</script>

<svelte:window on:resize={fitEditor} on:scroll={fitEditor} />
<FocusHandler manager={mgr} />
{#if editable && editable === true}
  <div class="editor-container {vertical} buttons-group xsmall-gap" bind:clientHeight={tHeight}>
    <div class="cover-channel" class:show class:copied={label === plugin.string.Copied} data-tooltip={lTraslate}>
      <input
        bind:this={input}
        class="search"
        type="text"
        bind:value
        placeholder={phTraslate}
        style="width: 100%;"
        on:keypress={(ev) => {
          if (ev.key === 'Enter') {
            dispatch('close', value)
            closeTooltip()
          }
        }}
        on:change
      />
    </div>
    <Button
      focusIndex={2}
      kind={'transparent'}
      size={'small'}
      icon={IconClose}
      disabled={value === ''}
      on:click={() => {
        if (input) {
          value = ''
          input.focus()
        }
      }}
    />
    <Button
      focusIndex={3}
      kind={'transparent'}
      size={'small'}
      icon={IconBlueCheck}
      on:click={() => {
        dispatch('close', value)
      }}
    />
  </div>
{:else}
  <div class="buttons-group xsmall-gap">
    <span
      class="select-text cover-channel"
      class:show
      class:copied={label === plugin.string.Copied}
      data-tooltip={lTraslate}>{value}</span
    >
    <Button
      focusIndex={3}
      kind={'transparent'}
      size={'small'}
      icon={IconCopy}
      on:mousemove={() => {
        show = true
      }}
      on:focus={() => {
        show = true
      }}
      on:mouseleave={() => {
        show = false
        label = plugin.string.CopyToClipboard
      }}
      on:blur={() => {
        show = false
        label = plugin.string.CopyToClipboard
      }}
      on:click={copyChannel}
    />
    {#if editable !== undefined}
      <Button
        focusIndex={4}
        kind={'transparent'}
        size={'small'}
        icon={IconEdit}
        on:click={() => {
          dispatch('update', 'edit')
        }}
      />
    {/if}
    {#if openable}
      <Button
        focusIndex={5}
        kind={'transparent'}
        size={'small'}
        icon={IconArrowRight}
        on:click={() => {
          dispatch('update', 'open')
        }}
      />
    {/if}
  </div>
{/if}

<style lang="scss">
  .cover-channel {
    position: relative;
    min-width: 0;
    min-height: 0;

    &.show::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: var(--board-bg-color);
      border-radius: 0.25rem;
      opacity: 0.95;
    }
    &.show.copied::before {
      background-color: var(--body-accent);
    }
    &.show::after {
      content: attr(data-tooltip);
      position: absolute;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      min-width: 0;
      top: 50%;
      left: 50%;
      width: calc(100% - 0.5rem);
      text-align: center;
      font-size: 0.75rem;
      color: var(--content-color);
      transform: translate(-50%, -50%);
    }
  }

  .editor-container {
    padding: 0.5rem;
    background-color: var(--accent-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.75rem;
    box-shadow: var(--popup-aside-shadow);

    &.top {
      transform: translate(calc(-50% + 0.75rem), -0.5rem);
    }
    &.bottom {
      transform: translate(calc(-50% + 0.75rem), 0.5rem);
    }
    &.top::after,
    &.top::before,
    &.bottom::after,
    &.bottom::before {
      content: '';
      position: absolute;
      margin-left: -9px;
      top: -6px;
      left: 50%;
      width: 18px;
      height: 7px;
    }
    &.top::before,
    &.bottom::before {
      background-color: var(--accent-bg-color);
      clip-path: url('#nub-bg');
      z-index: 1;
    }
    &.top::after,
    &.bottom::after {
      background-color: var(--divider-color);
      clip-path: url('#nub-border');
      z-index: 2;
    }
    &.top::after,
    &.top::before {
      top: calc(100% - 1px);
      transform-origin: center center;
      transform: rotate(180deg);
    }
  }
</style>
