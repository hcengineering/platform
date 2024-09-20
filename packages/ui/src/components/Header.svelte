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
    resizeObserver,
    HeaderAdaptive,
    popupstore
  } from '..'

  export let type: 'type-aside' | 'type-popup' | 'type-component' | 'type-panel' = 'type-component'
  export let allowFullsize: boolean = false
  export let hideSeparator: boolean = false
  export let topIndent: boolean = false
  export let adaptive: HeaderAdaptive = 'default'
  export let hideBefore: boolean = false
  export let hideDescription: boolean = false
  export let hideSearch: boolean = false
  export let hideActions: boolean = false
  export let hideExtra: boolean = false
  export let overflowExtra: boolean = false
  export let noPrint: boolean = false
  export let freezeBefore: boolean = false
  export let doubleRowWidth = 768
  export let closeOnEscape: boolean = true

  const dispatch = createEventDispatcher()

  const closeButton: boolean = ['type-popup', 'type-aside'].some((v) => v === type)
  let spaceFiller: HTMLElement
  let doubleRow: boolean = false
  let doubleExtra: boolean = false
  let extraWidth: number = 0
  let spaceWidth: number = 0
  $: _doubleRow =
    adaptive === 'doubleRow' ||
    (adaptive !== 'disabled' && doubleRow) ||
    (adaptive === 'autoExtra' && (doubleRow || doubleExtra))

  onMount(() => {
    if (closeButton) window.addEventListener('keydown', _close)
  })
  onDestroy(() => {
    if (closeButton) window.removeEventListener('keydown', _close)
  })

  function _close (ev: KeyboardEvent): void {
    if (closeButton && ev.key === 'Escape' && closeOnEscape) {
      ev.preventDefault()
      ev.stopPropagation()

      if (type === 'type-aside' && $popupstore.length > 0) {
        return
      }

      dispatch('close')
    }
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  use:resizeObserver={(element) => {
    if (!doubleRow && element.clientWidth <= doubleRowWidth) doubleRow = true
    else if (doubleRow && element.clientWidth > doubleRowWidth) doubleRow = false
  }}
  class="hulyHeader-container"
  class:doubleRow={_doubleRow}
  class:topIndent
  class:clearPadding={$$slots.description}
  class:hideSeparator
  class:no-print={noPrint}
>
  {#if _doubleRow}
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
      <div
        class="hulyHeader-titleGroup"
        class:withDescription={$$slots.description && !hideDescription}
        class:notGrow={adaptive === 'autoExtra'}
        on:click
      >
        {#if $$slots.description && !hideDescription}
          <div class="hulyHeader-titleGroup"><slot /></div>
          <div class="hulyHeader-titleGroup"><slot name="description" /></div>
        {:else}
          <slot />
        {/if}
      </div>

      {#if adaptive === 'autoExtra'}
        <div
          class="hulyHeader-spaceFiller"
          bind:this={spaceFiller}
          use:resizeObserver={(element) => {
            if (spaceWidth !== element.clientWidth) spaceWidth = element.clientWidth
            if (doubleExtra && element.clientWidth > extraWidth + 42) doubleExtra = false
          }}
        />
      {/if}

      {#if $$slots.actions && !hideActions && (adaptive === 'freezeActions' || adaptive === 'doubleRow' || adaptive === 'autoExtra')}
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
      {#if $$slots.extra && !hideExtra && (adaptive === 'doubleRow' || adaptive === 'autoExtra')}
        <div
          class="hulyHeader-buttonsGroup extra"
          class:overflow={overflowExtra}
          use:resizeObserver={(element) => {
            if (extraWidth !== element.clientWidth) extraWidth = element.clientWidth
          }}
        >
          <slot name="extra" {doubleRow} />
        </div>
      {/if}
      {#if $$slots.actions && !hideActions && !(adaptive === 'freezeActions' || adaptive === 'doubleRow' || adaptive === 'autoExtra')}
        <div class="hulyHeader-buttonsGroup actions">
          <slot name="actions" {doubleRow} />
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
    <div
      class="hulyHeader-titleGroup"
      class:withDescription={$$slots.description && !hideDescription}
      class:notGrow={adaptive === 'autoExtra'}
      on:click
    >
      {#if $$slots.description && !hideDescription}
        <slot />
        <slot name="description" />
      {:else}
        <slot />
      {/if}
    </div>

    {#if adaptive === 'autoExtra'}
      <div
        class="hulyHeader-spaceFiller"
        bind:this={spaceFiller}
        use:resizeObserver={(element) => {
          if (spaceWidth !== element.clientWidth) spaceWidth = element.clientWidth
          if (!doubleExtra && element.clientWidth <= 16) doubleExtra = true
        }}
      />
    {/if}

    {#if $$slots.search && !hideSearch}
      <div class="hulyHeader-buttonsGroup search no-print">
        <slot name="search" {doubleRow} />
      </div>
      {#if $$slots.actions && !hideActions}<div class="hulyHeader-divider no-print" />{/if}
    {/if}
    {#if $$slots.extra && !hideExtra}
      <div
        class="hulyHeader-buttonsGroup extra"
        class:overflow={overflowExtra}
        use:resizeObserver={(element) => {
          if (extraWidth !== element.clientWidth) extraWidth = element.clientWidth
        }}
      >
        <slot name="extra" {doubleRow} />
      </div>
    {/if}
    {#if $$slots.actions && !hideActions}
      <div class="hulyHeader-buttonsGroup actions no-print">
        <slot name="actions" {doubleRow} />
      </div>
    {/if}
    {#if closeButton}
      {#if type !== 'type-popup'}<div class="hulyHeader-divider no-print" />{/if}
      {#if closeOnEscape}
        <div class="hulyHotKey-item no-print">Esc</div>
      {/if}
      <ButtonIcon icon={IconClose} kind={'tertiary'} size={'small'} noPrint on:click={() => dispatch('close')} />
    {/if}
  {/if}
</div>
