<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  import {
    IconMaximize,
    IconMinimize,
    IconClose,
    ButtonIcon,
    deviceOptionsStore as deviceInfo,
    resizeObserver
  } from '..'

  export let type: 'type-aside' | 'type-popup' | 'type-component' | 'type-panel' = 'type-component'
  export let allowFullsize: boolean = false
  export let hideSeparator: boolean = false
  export let topIndent: boolean = false
  export let adaptive: 'default' | 'freezeActions' | 'doubleRow' | 'disabled' = 'default'
  export let hideBefore: boolean = false
  export let hideDescription: boolean = false
  export let hideSearch: boolean = false
  export let hideActions: boolean = false
  export let hideExtra: boolean = false
  export let overflowExtra: boolean = false
  export let noPrint: boolean = false
  export let freezeBefore: boolean = false

  const dispatch = createEventDispatcher()

  const closeButton: boolean = ['type-popup', 'type-aside'].some((v) => v === type)
  let doubleRow: boolean = false

  onMount(() => {
    if (closeButton) window.addEventListener('keydown', _close)
  })
  onDestroy(() => {
    if (closeButton) window.removeEventListener('keydown', _close)
  })

  function _close (ev: KeyboardEvent): void {
    if (closeButton && ev.key === 'Escape') {
      ev.preventDefault()
      ev.stopPropagation()
      dispatch('close')
    }
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  use:resizeObserver={(element) => {
    if (!doubleRow && element.clientWidth <= 768) doubleRow = true
    else if (doubleRow && element.clientWidth > 768) doubleRow = false
  }}
  class="hulyHeader-container"
  class:doubleRow={adaptive === 'doubleRow' || (adaptive !== 'disabled' && doubleRow)}
  class:topIndent
  class:clearPadding={$$slots.description}
  class:hideSeparator
  class:no-print={noPrint}
>
  {#if adaptive === 'doubleRow' || (adaptive !== 'disabled' && doubleRow)}
    <div class="hulyHeader-row">
      {#if allowFullsize}
        <ButtonIcon
          icon={$deviceInfo.navigator.visible ? IconMaximize : IconMinimize}
          kind={'tertiary'}
          size={'small'}
          noPrint
          on:click={() => ($deviceInfo.navigator.visible = !$deviceInfo.navigator.visible)}
        />
        <div class="hulyHeader-divider no-print" />
      {/if}
      {#if $$slots.beforeTitle && !hideBefore}
        <div class="hulyHeader-buttonsGroup before mr-2 no-print" class:freezeBefore>
          <slot name="beforeTitle" {doubleRow} />
        </div>
      {/if}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="hulyHeader-titleGroup" class:withDescription={$$slots.description && !hideDescription} on:click>
        {#if $$slots.description && !hideDescription}
          <div class="hulyHeader-titleGroup"><slot /></div>
          <div class="hulyHeader-titleGroup"><slot name="description" /></div>
        {:else}
          <slot />
        {/if}
      </div>
      {#if $$slots.actions && !hideActions && (adaptive === 'freezeActions' || adaptive === 'doubleRow')}
        <div class="hulyHeader-buttonsGroup actions no-print">
          <slot name="actions" {doubleRow} />
        </div>
      {/if}
      {#if closeButton}
        {#if type !== 'type-popup'}<div class="hulyHeader-divider no-print" />{/if}
        <div class="hulyHotKey-item no-print">Esc</div>
        <ButtonIcon icon={IconClose} kind={'tertiary'} size={'small'} noPrint on:click={() => dispatch('close')} />
      {/if}
    </div>
    <!-- <div class="hulyHeader-row__divider" /> -->
    <div class="hulyHeader-row no-print" class:between={$$slots.search} class:reverse={!$$slots.search}>
      {#if $$slots.search}
        <div class="hulyHeader-buttonsGroup search">
          <slot name="search" {doubleRow} />
        </div>
      {/if}
      {#if $$slots.actions && !hideActions && adaptive !== 'freezeActions' && adaptive !== 'doubleRow'}
        <div class="hulyHeader-buttonsGroup actions">
          <slot name="actions" {doubleRow} />
        </div>
      {/if}
      {#if $$slots.extra && !hideExtra && adaptive === 'doubleRow'}
        <div class="hulyHeader-buttonsGroup extra" class:overflow={overflowExtra}>
          <slot name="extra" {doubleRow} />
        </div>
      {/if}
    </div>
  {:else}
    {#if allowFullsize}
      <ButtonIcon
        icon={$deviceInfo.navigator.visible ? IconMaximize : IconMinimize}
        kind={'tertiary'}
        size={'small'}
        noPrint
        on:click={() => ($deviceInfo.navigator.visible = !$deviceInfo.navigator.visible)}
      />
      <div class="hulyHeader-divider no-print" />
    {/if}
    {#if $$slots.beforeTitle && !hideBefore}
      <div class="hulyHeader-buttonsGroup before mr-2 no-print">
        <slot name="beforeTitle" {doubleRow} />
      </div>
    {/if}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="hulyHeader-titleGroup" class:withDescription={$$slots.description && !hideDescription} on:click>
      {#if $$slots.description && !hideDescription}
        <slot />
        <slot name="description" />
      {:else}
        <slot />
      {/if}
    </div>
    {#if $$slots.search && !hideSearch}
      <div class="hulyHeader-buttonsGroup search no-print">
        <slot name="search" {doubleRow} />
      </div>
      {#if $$slots.actions && !hideActions}<div class="hulyHeader-divider no-print" />{/if}
    {/if}
    {#if $$slots.actions && !hideActions}
      <div class="hulyHeader-buttonsGroup actions no-print">
        <slot name="actions" {doubleRow} />
      </div>
    {/if}
    {#if closeButton}
      {#if type !== 'type-popup'}<div class="hulyHeader-divider no-print" />{/if}
      <div class="hulyHotKey-item no-print">Esc</div>
      <ButtonIcon icon={IconClose} kind={'tertiary'} size={'small'} noPrint on:click={() => dispatch('close')} />
    {/if}
  {/if}
</div>
