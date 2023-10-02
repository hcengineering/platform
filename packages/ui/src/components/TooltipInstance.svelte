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
  import { afterUpdate, onDestroy } from 'svelte'
  import { resizeObserver } from '../resize'
  import { closeTooltip, tooltipstore as tooltip } from '../tooltips'
  import type { TooltipAlignment } from '../types'
  import Component from './Component.svelte'
  import Label from './Label.svelte'
  import { capitalizeFirstLetter, formatKey } from '../utils'

  let tooltipHTML: HTMLElement
  let nubHTML: HTMLElement
  let dir: TooltipAlignment
  let rect: DOMRect | undefined
  let rectAnchor: DOMRect
  let tooltipSW: boolean // tooltipSW = true - Label; false - Component
  let nubDirection: 'top' | 'bottom' | 'left' | 'right' | undefined = undefined
  let clWidth: number
  let docWidth: number
  let docHeight: number
  let shown: boolean = false

  $: tooltipSW = !$tooltip.component && $tooltip.kind !== 'submenu'
  $: onUpdate = $tooltip.onUpdate
  $: kind = $tooltip.kind

  interface TooltipOptions {
    top: string
    bottom: string
    left: string
    right: string
    width: string
    height: string
    transform: string
    visibility: string
    classList: string
  }

  let options: TooltipOptions = {
    top: '',
    bottom: '',
    left: '',
    right: '',
    width: '',
    height: '',
    transform: '',
    visibility: 'hidden',
    classList: ''
  }

  const clearStyles = (): void => {
    shown = false
    options = {
      top: '',
      bottom: '',
      left: '',
      right: '',
      width: '',
      height: '',
      transform: '',
      visibility: 'hidden',
      classList: ''
    }
  }

  const fitTooltip = (tooltipHTMLToCheck: HTMLElement, clWidth?: number): TooltipOptions => {
    const options: TooltipOptions = {
      top: '',
      bottom: '',
      left: '',
      right: '',
      width: '',
      height: '',
      transform: '',
      visibility: 'visible',
      classList: ''
    }
    if (($tooltip.label || $tooltip.component) && tooltipHTML && tooltipHTMLToCheck) {
      if (clWidth === undefined) {
        clWidth = tooltipHTML.clientWidth
      }
      if ($tooltip.element) {
        rect = $tooltip.element.getBoundingClientRect()
        rectAnchor = $tooltip.anchor
          ? $tooltip.anchor.getBoundingClientRect()
          : $tooltip.element.getBoundingClientRect()

        if ($tooltip.component) {
          clearStyles()
          if (rect.bottom + tooltipHTMLToCheck.clientHeight + 28 < docHeight) {
            options.top = `calc(${rect.bottom}px + 5px + .25rem)`
            dir = 'bottom'
          } else if (rect.top > docHeight - rect.bottom) {
            options.bottom = `calc(${docHeight - rect.y}px + 5px + .25rem)`
            if (tooltipHTML.clientHeight > rect.top - 28) {
              options.top = '1rem'
              options.height = `calc(${rect.top}px - 5px - 1.25rem)`
            }
            dir = 'top'
          } else {
            options.top = `calc(${rect.bottom}px + 5px + .25rem)`
            if (tooltipHTMLToCheck.clientHeight > docHeight - rect.bottom - 28) {
              options.bottom = '1rem'
              options.height = `calc(${docHeight - rect.bottom}px - 5px - 1.25rem)`
            }
            dir = 'bottom'
          }

          const tempLeft = rect.width / 2 + rect.left - clWidth / 2
          if (tempLeft + clWidth > docWidth - 8) options.right = '.5rem'
          else if (tempLeft < 8) options.left = '.5rem'
          else options.left = `${tempLeft}px`

          if (nubHTML) {
            nubHTML.style.top = rect.top + 'px'
            nubHTML.style.left = rect.left + 'px'
            nubHTML.style.width = rect.width + 'px'
            nubHTML.style.height = rect.height + 'px'
            nubDirection = dir
          }
        } else {
          if (!$tooltip.direction) {
            if (rectAnchor.right < docWidth / 5) dir = 'right'
            else if (rectAnchor.left > docWidth - docWidth / 5) dir = 'left'
            else if (rectAnchor.top < tooltipHTMLToCheck.clientHeight) dir = 'bottom'
            else dir = 'top'
          } else dir = $tooltip.direction

          if (dir === 'right') {
            options.top = rectAnchor.y + rectAnchor.height / 2 + 'px'
            options.left = `calc(${rectAnchor.right}px + .75rem)`
            options.transform = 'translateY(-50%)'
          } else if (dir === 'left') {
            options.top = rectAnchor.y + rectAnchor.height / 2 + 'px'
            options.right = `calc(${docWidth - rectAnchor.x}px + .75rem)`
            options.transform = 'translateY(-50%)'
          } else if (dir === 'bottom') {
            options.top = `calc(${rectAnchor.bottom}px + .5rem)`
            options.left = rectAnchor.x + rectAnchor.width / 2 + 'px'
            options.transform = 'translateX(-50%)'
          } else if (dir === 'top') {
            options.bottom = `calc(${docHeight - rectAnchor.y}px + .75rem)`
            options.left = rectAnchor.x + rectAnchor.width / 2 + 'px'
            options.transform = 'translateX(-50%)'
          }
        }
      } else {
        options.top = '50%'
        options.left = '50%'
        options.width = 'min-content'
        options.height = 'min-content'
        options.transform = 'translate(-50%, -50%)'
        options.classList = 'no-arrow'
      }
      options.visibility = 'visible'
      shown = true
    } else if (tooltipHTML) {
      shown = false
      options.visibility = 'hidden'
    }
    return options
  }

  const fitSubmenu = (): TooltipOptions => {
    const options: TooltipOptions = {
      top: '',
      bottom: '',
      left: '',
      right: '',
      width: '',
      height: '',
      visibility: 'visible',
      transform: '',
      classList: ''
    }
    if (($tooltip.label || $tooltip.component) && tooltipHTML) {
      if ($tooltip.element) {
        rect = $tooltip.element.getBoundingClientRect()
        const rectP = tooltipHTML.getBoundingClientRect()
        const dirH =
          docWidth - rect.right - rectP.width - 16 > 0 ? 'right' : rect.left > docWidth - rect.right ? 'left' : 'right'
        const dirV =
          docHeight - rect.top - rectP.height - 16 > 0
            ? 'bottom'
            : rect.bottom > docHeight - rect.top
              ? 'top'
              : 'bottom'
        if (dirH === 'right') {
          options.left = rect.right - 4 + 'px'
        } else {
          options.right = docWidth - rect.left - 4 + 'px'
        }
        if (dirV === 'bottom') {
          options.top = rect.top - 4 + 'px'
        } else {
          options.bottom = docHeight - rect.bottom - 4 + 'px'
        }
        options.visibility = 'visible'
      }
    } else if (tooltipHTML) {
      options.visibility = 'hidden'
    }
    return options
  }

  const hideTooltip = (): void => {
    if (tooltipHTML) options.visibility = 'hidden'
    closeTooltip()
  }

  const whileShow = (ev: MouseEvent): void => {
    if ($tooltip.element && tooltipHTML) {
      const rectP = tooltipHTML.getBoundingClientRect()
      rect = $tooltip.element.getBoundingClientRect()
      const dT: number = dir === 'bottom' && $tooltip.kind !== 'submenu' ? 12 : 0
      const dB: number = dir === 'top' && $tooltip.kind !== 'submenu' ? 12 : 0
      const inTrigger: boolean = ev.x >= rect.left && ev.x <= rect.right && ev.y >= rect.top && ev.y <= rect.bottom
      const inPopup: boolean =
        ev.x >= rectP.left && ev.x <= rectP.right && ev.y >= rectP.top - dT && ev.y <= rectP.bottom + dB

      if ($tooltip.kind !== 'popup') {
        if ((tooltipSW && !inTrigger) || !(inTrigger || inPopup)) hideTooltip()
      }
    }
  }

  $: if (kind === 'submenu') {
    options = fitSubmenu()
  } else {
    options = fitTooltip(tooltipHTML, clWidth)
  }
  afterUpdate(() => {
    if (kind === 'submenu') {
      options = fitSubmenu()
    } else {
      options = fitTooltip(tooltipHTML, clWidth)
    }
  })
  onDestroy(() => hideTooltip())
</script>

{#if $tooltip.kind === 'popup'}
  <div
    class="modal-overlay antiOverlay"
    on:click|stopPropagation|preventDefault={() => closeTooltip()}
    on:keydown|stopPropagation|preventDefault={() => {}}
  />
{/if}

<svelte:window
  bind:innerWidth={docWidth}
  bind:innerHeight={docHeight}
  on:resize={() => {
    if ($tooltip.kind !== 'popup') {
      hideTooltip()
    }
  }}
  on:mousemove={(ev) => {
    whileShow(ev)
  }}
  on:keydown={(evt) => {
    if (($tooltip.component || $tooltip.label) && evt.key === 'Escape' && $tooltip.kind !== 'popup') {
      evt.preventDefault()
      evt.stopImmediatePropagation()
      hideTooltip()
    }
  }}
/>
{#if $tooltip.component && $tooltip.kind !== 'submenu'}
  <div
    class="popup-tooltip {options.classList}"
    class:shown
    class:doublePadding={$tooltip.label}
    use:resizeObserver={(element) => {
      clWidth = element.clientWidth
      options = fitTooltip(tooltipHTML, clWidth)
    }}
    style:top={options.top}
    style:bottom={options.bottom}
    style:left={options.left}
    style:right={options.right}
    style:width={options.width}
    style:height={options.height}
    style:transform={options.transform}
    bind:this={tooltipHTML}
  >
    {#if $tooltip.label}
      <div class="fs-title mb-4">
        <Label label={$tooltip.label} params={$tooltip.props ?? {}} />
      </div>
    {/if}
    {#if typeof $tooltip.component === 'string'}
      <Component
        is={$tooltip.component}
        props={$tooltip.props}
        on:update={onUpdate !== undefined ? onUpdate : async () => {}}
      />
    {:else}
      <svelte:component
        this={$tooltip.component}
        {...$tooltip.props}
        on:tooltip={(evt) => {
          $tooltip = { ...$tooltip, ...evt.detail }
        }}
        on:update={onUpdate !== undefined ? onUpdate : async () => {}}
      />
    {/if}
  </div>
  <div bind:this={nubHTML} class="nub {nubDirection ?? ''}" class:shown />
{:else if $tooltip.label && $tooltip.kind !== 'submenu'}
  <div
    class="tooltip {dir ?? ''} {options.classList}"
    bind:this={tooltipHTML}
    style:top={options.top}
    style:bottom={options.bottom}
    style:left={options.left}
    style:right={options.right}
    style:width={options.width}
    style:height={options.height}
    style:transform={options.transform}
  >
    <Label label={$tooltip.label} params={$tooltip.props ?? {}} />
    {#if $tooltip.keys !== undefined}
      <div class="keys">
        {#each $tooltip.keys as key, i}
          {#if i !== 0}
            <div class="mr-1 ml-1">/</div>
          {/if}
          {#each formatKey(key) as k, jj}
            <div class="key">
              {#each k as kk, j}
                {#if j !== 0}
                  +
                {/if}
                {capitalizeFirstLetter(kk.trim())}
              {/each}
            </div>
          {/each}
        {/each}
      </div>
    {/if}
  </div>
{:else if $tooltip.kind === 'submenu'}
  <div
    class="submenu-container {dir ?? ''} {options.classList}"
    use:resizeObserver={(element) => {
      clWidth = element.clientWidth
    }}
    style:top={options.top}
    style:bottom={options.bottom}
    style:left={options.left}
    style:right={options.right}
    style:width={options.width}
    style:height={options.height}
    style:transform={options.transform}
    bind:this={tooltipHTML}
  >
    {#if typeof $tooltip.component === 'string'}
      <Component
        is={$tooltip.component}
        props={$tooltip.props}
        on:update={onUpdate !== undefined ? onUpdate : async () => {}}
      />
    {:else}
      <svelte:component
        this={$tooltip.component}
        {...$tooltip.props}
        on:update={onUpdate !== undefined ? onUpdate : async () => {}}
      />
    {/if}
  </div>
{/if}

<style lang="scss">
  .submenu-container {
    position: fixed;
    width: auto;
    height: auto;
    border-radius: 0.5rem;
    z-index: 10000;
  }
  .popup-tooltip {
    overflow: hidden;
    position: fixed;
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    max-width: 50vw;
    color: var(--theme-content-color);
    background-color: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 0.75rem;
    box-shadow: var(--theme-popup-shadow);
    user-select: none;
    opacity: 0;
    z-index: 10000;

    &.doublePadding {
      padding: 1rem;
    }
  }

  .nub {
    position: fixed;
    // background-color: rgba(255, 255, 0, .5);
    user-select: none;
    pointer-events: none;
    opacity: 0;
    z-index: 10000;

    &::after,
    &::before {
      position: absolute;
      width: 18px;
      height: 7px;
    }
    &::before {
      background-color: var(--theme-popup-color);
      clip-path: url('#nub-bg');
      z-index: 1;
    }
    &::after {
      background-color: var(--theme-popup-divider);
      clip-path: url('#nub-border');
      z-index: 2;
    }

    &.top::after,
    &.bottom::after,
    &.top::before,
    &.bottom::before,
    &.right::after,
    &.left::after,
    &.right::before,
    &.left::before {
      content: '';
    }
    &.top::after,
    &.bottom::after,
    &.top::before,
    &.bottom::before {
      left: 50%;
      margin-left: -9px;
    }
    &.top::after,
    &.top::before {
      top: calc(-7px - 0.25rem);
      transform: rotate(180deg);
    }
    &.bottom::after,
    &.bottom::before {
      bottom: calc(-7px - 0.25rem);
    }

    &.right::after,
    &.left::after,
    &.right::before,
    &.left::before {
      top: 50%;
      margin-top: -9px;
    }
    &.left::after,
    &.left::before {
      transform-origin: left top;
      left: -0.25rem;
      transform: rotate(90deg);
    }
    &.right::after,
    &.right::before {
      transform-origin: right top;
      right: -0.25rem;
      transform: rotate(-90deg);
    }
  }
  .shown {
    transition: opacity 0.1s ease-in-out 0.15s;
    opacity: 1;
  }

  .keys {
    margin-left: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.125rem;
  }

  .key {
    border-radius: 0.125rem;
    font-size: 0.75rem;
    min-width: 1.5rem;
    padding: 0.25rem;
    background-color: var(--theme-tooltip-key-bg);
  }

  .tooltip {
    position: fixed;
    padding: 0.5rem;
    text-align: center;
    font-size: 0.75rem;
    color: var(--theme-tooltip-color);
    background-color: var(--theme-tooltip-bg);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 0.25rem;
    box-shadow: var(--theme-popup-shadow);
    user-select: none;
    z-index: 10000;
    display: flex;
    align-items: center;

    &::before {
      background-color: var(--theme-popup-color);
      clip-path: url('#nub-bg');
      z-index: 1;
    }
    &::after {
      background-color: var(--theme-popup-divider);
      clip-path: url('#nub-border');
      z-index: 2;
    }
  }
  .no-arrow {
    box-shadow: 0px 0px 20px rgba(0, 0, 0, 0.75);
    &::after,
    &::before {
      content: none;
    }
  }
  .modal-overlay {
    z-index: 10000;

    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    pointer-events: all;
    touch-action: none;
  }
</style>
