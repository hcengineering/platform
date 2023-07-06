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
  import type { IntlString } from '@hcengineering/platform'
  import { translate } from '@hcengineering/platform'
  import { copyTextToClipboard } from '@hcengineering/presentation'
  import { PopupOptions, themeStore } from '@hcengineering/ui'
  import {
    Button,
    createFocusManager,
    FocusHandler,
    IconArrowRight,
    IconBlueCheck,
    IconClose,
    registerFocus
  } from '@hcengineering/ui'
  import { afterUpdate, createEventDispatcher, onMount } from 'svelte'
  import plugin from '../plugin'
  import IconCopy from './icons/Copy.svelte'

  export let value: string = ''
  export let placeholder: IntlString
  export let editable: boolean | undefined = undefined
  export let openable: boolean = false
  export let popupOptions: PopupOptions

  const dispatch = createEventDispatcher()
  let input: HTMLInputElement
  let phTraslate: string
  $: translate(placeholder, {}, $themeStore.language).then((tr) => (phTraslate = tr))
  let label: IntlString = plugin.string.CopyToClipboard
  let lTraslate: string
  $: translate(label, {}, $themeStore.language).then((tr) => (lTraslate = tr))
  let show: boolean = false

  const copyChannel = (): void => {
    if (label === plugin.string.CopyToClipboard) {
      copyTextToClipboard(value).then(() => (label = plugin.string.Copied))
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

  let dir: string = 'bottom'
  const vDir = (d: string): string => d.split('|')[0]
  const fitEditor = (): void => {
    if (popupOptions) dir = vDir(popupOptions.direction)
  }
  $: if (popupOptions) dir = vDir(popupOptions.direction)
  afterUpdate(() => {
    fitEditor()
  })
</script>

<svelte:window on:resize={fitEditor} on:scroll={fitEditor} />
<FocusHandler manager={mgr} />
{#if editable}
  <div class="editor-container {dir} buttons-group xsmall-gap">
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
            ev.preventDefault()
            ev.stopPropagation()
            dispatch('close', value)
          }
        }}
        on:change
      />
    </div>
    <Button
      focusIndex={2}
      kind={'ghost'}
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
      id="channel-ok"
      focusIndex={3}
      kind={'ghost'}
      size={'small'}
      icon={IconBlueCheck}
      on:click={() => {
        dispatch('close', value)
      }}
    />
    {#if openable}
      <Button
        focusIndex={4}
        kind={'ghost'}
        size={'small'}
        icon={IconArrowRight}
        on:click={() => {
          dispatch('update', value)
          dispatch('close', 'open')
        }}
      />
    {/if}
  </div>
{:else}
  <div class="flex-row-center gap-2">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <span
      class="select-text cover-channel overflow-label"
      class:show
      class:copied={label === plugin.string.Copied}
      class:cursor-pointer={openable}
      data-tooltip={lTraslate}
      on:click={() => {
        if (openable) {
          dispatch('update', 'open')
        }
      }}>{value}</span
    >
    <Button
      focusIndex={3}
      kind={'ghost'}
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
    {#if openable}
      <Button
        focusIndex={5}
        kind={'ghost'}
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
      background-color: var(--theme-popup-hover);
      border: 1px solid transparent;
      border-radius: 0.25rem;
      opacity: 0.95;
    }
    &.show.copied::before {
      border-color: var(--theme-divider-color);
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
      color: var(--theme-content-color);
      transform: translate(-50%, -50%);
    }
  }

  .editor-container {
    padding: 0.5rem;
    background-color: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 0.75rem;
    box-shadow: var(--theme-popup-shadow);

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
      background-color: var(--theme-popup-color);
      clip-path: url('#nub-bg');
      z-index: 1;
    }
    &.top::after,
    &.bottom::after {
      background-color: var(--theme-popup-divider);
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
