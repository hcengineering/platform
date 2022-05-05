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
  import { tooltipstore as tooltip, closeTooltip, Component } from '..'
  import type { TooltipAlignment } from '..'
  import Label from './Label.svelte'

  let tooltipHTML: HTMLElement
  let nubHTML: HTMLElement
  let dir: TooltipAlignment
  let rect: DOMRect
  let rectAnchor: DOMRect
  let tooltipSW: boolean // tooltipSW = true - Label; false - Component
  let nubDirection: 'top' | 'bottom' | 'left' | 'right' | undefined = undefined
  let clWidth: number

  $: tooltipSW = !$tooltip.component
  $: onUpdate = $tooltip.onUpdate

  const fitTooltip = (): void => {
    if (($tooltip.label || $tooltip.component) && tooltipHTML) {
      if ($tooltip.element) {
        const doc = document.body.getBoundingClientRect()
        rect = $tooltip.element.getBoundingClientRect()
        rectAnchor = $tooltip.anchor
          ? $tooltip.anchor.getBoundingClientRect()
          : $tooltip.element.getBoundingClientRect()

        if ($tooltip.component) {
          tooltipHTML.style.top =
            tooltipHTML.style.bottom =
            tooltipHTML.style.left =
            tooltipHTML.style.right =
            tooltipHTML.style.height =
              ''
          if (rect.bottom + tooltipHTML.clientHeight + 28 < doc.height) {
            tooltipHTML.style.top = `calc(${rect.bottom}px + 5px + .25rem)`
            dir = 'bottom'
          } else if (rect.top > doc.height - rect.bottom) {
            tooltipHTML.style.bottom = `calc(${doc.height - rect.y}px + 5px + .25rem)`
            if (tooltipHTML.clientHeight > rect.top - 28) {
              tooltipHTML.style.top = '1rem'
              tooltipHTML.style.height = `calc(${rect.top}px - 5px - 1.25rem)`
            }
            dir = 'top'
          } else {
            tooltipHTML.style.top = `calc(${rect.bottom}px + 5px + .25rem)`
            if (tooltipHTML.clientHeight > doc.height - rect.bottom - 28) {
              tooltipHTML.style.bottom = '1rem'
              tooltipHTML.style.height = `calc(${doc.height - rect.bottom}px - 5px - 1.25rem)`
            }
            dir = 'bottom'
          }

          const tempLeft = rect.width / 2 + rect.left - clWidth / 2
          if (tempLeft + clWidth > doc.width - 8) tooltipHTML.style.right = '.5rem'
          else if (tempLeft < 8) tooltipHTML.style.left = '.5rem'
          else tooltipHTML.style.left = `${tempLeft}px`

          if (nubHTML) {
            nubHTML.style.top = rect.top + 'px'
            nubHTML.style.left = rect.left + 'px'
            nubHTML.style.width = rect.width + 'px'
            nubHTML.style.height = rect.height + 'px'
            nubDirection = dir
          }
        } else {
          if (!$tooltip.direction) {
            if (rectAnchor.right < doc.width / 5) dir = 'right'
            else if (rectAnchor.left > doc.width - doc.width / 5) dir = 'left'
            else if (rectAnchor.top < tooltipHTML.clientHeight) dir = 'bottom'
            else dir = 'top'
          } else dir = $tooltip.direction

          if (dir === 'right') {
            tooltipHTML.style.top = rectAnchor.y + rectAnchor.height / 2 + 'px'
            tooltipHTML.style.left = `calc(${rectAnchor.right}px + .75rem)`
            tooltipHTML.style.transform = 'translateY(-50%)'
          } else if (dir === 'left') {
            tooltipHTML.style.top = rectAnchor.y + rectAnchor.height / 2 + 'px'
            tooltipHTML.style.right = `calc(${doc.width - rectAnchor.x}px + .75rem)`
            tooltipHTML.style.transform = 'translateY(-50%)'
          } else if (dir === 'bottom') {
            tooltipHTML.style.top = `calc(${rectAnchor.bottom}px + .5rem)`
            tooltipHTML.style.left = rectAnchor.x + rectAnchor.width / 2 + 'px'
            tooltipHTML.style.transform = 'translateX(-50%)'
          } else if (dir === 'top') {
            tooltipHTML.style.bottom = `calc(${doc.height - rectAnchor.y}px + .75rem)`
            tooltipHTML.style.left = rectAnchor.x + rectAnchor.width / 2 + 'px'
            tooltipHTML.style.transform = 'translateX(-50%)'
          }
          tooltipHTML.classList.remove('no-arrow')
        }
      } else {
        tooltipHTML.style.top = '50%'
        tooltipHTML.style.left = '50%'
        tooltipHTML.style.width = 'min-content'
        tooltipHTML.style.height = 'min-content'
        tooltipHTML.style.transform = 'translate(-50%, -50%)'
        tooltipHTML.classList.add('no-arrow')
      }
      tooltipHTML.style.visibility = 'visible'
    } else if (tooltipHTML) tooltipHTML.style.visibility = 'hidden'
  }

  const hideTooltip = (): void => {
    if (tooltipHTML) tooltipHTML.style.visibility = 'hidden'
    closeTooltip()
  }

  let timeout: number
  const whileShow = (ev: MouseEvent): void => {
    if ($tooltip.element && tooltipHTML) {
      const rectP = tooltipHTML.getBoundingClientRect()
      const dT: number = dir === 'bottom' ? 12 : 0
      const dB: number = dir === 'top' ? 12 : 0
      const inTrigger: boolean = ev.x >= rect.left && ev.x <= rect.right && ev.y >= rect.top && ev.y <= rect.bottom
      const inPopup: boolean =
        ev.x >= rectP.left && ev.x <= rectP.right && ev.y >= rectP.top - dT && ev.y <= rectP.bottom + dB

      clearTimeout(timeout)
      if (tooltipSW) {
        if (!inTrigger) {
          timeout = setTimeout(() => {
            hideTooltip()
          }, 100)
        }
      } else {
        if (!(inTrigger || inPopup)) {
          timeout = setTimeout(() => {
            hideTooltip()
          }, 100)
        }
      }
    }
  }

  afterUpdate(() => fitTooltip())
  onDestroy(() => hideTooltip())
</script>

<svelte:window
  on:resize={hideTooltip}
  on:mousemove={(ev) => {
    whileShow(ev)
  }}
/>
{#if $tooltip.component}
  <div class="popup-tooltip" class:doublePadding={$tooltip.label} bind:clientWidth={clWidth} bind:this={tooltipHTML}>
    {#if $tooltip.label}<div class="fs-title mb-4">
        <Label label={$tooltip.label} params={$tooltip.props ?? {}} />
      </div>{/if}
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
  <div bind:this={nubHTML} class="nub {nubDirection ?? ''}" />
{:else if $tooltip.label}
  <div class="tooltip {dir ?? ''}" bind:this={tooltipHTML}>
    <Label label={$tooltip.label} params={$tooltip.props ?? {}} />
  </div>
{/if}

<style lang="scss">
  .popup-tooltip {
    overflow: hidden;
    position: fixed;
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    color: var(--caption-color);
    background-color: var(--accent-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.75rem;
    box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.2);
    user-select: none;
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
    z-index: 10000;

    &::after,
    &::before {
      position: absolute;
      width: 18px;
      height: 7px;
    }
    &::before {
      background-color: var(--accent-bg-color);
      clip-path: url('#nub-bg');
      z-index: 1;
    }
    &::after {
      background-color: var(--divider-color);
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

  .tooltip {
    position: fixed;
    padding: 0.5rem 0.75rem;
    text-align: center;
    color: var(--caption-color);
    background-color: var(--accent-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.75rem;
    box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.2);
    user-select: none;
    z-index: 10000;

    &::after,
    &::before {
      content: '';
      position: absolute;
      width: 18px;
      height: 7px;
    }
    &::before {
      background-color: var(--accent-bg-color);
      clip-path: url('#nub-bg');
      z-index: 1;
    }
    &::after {
      background-color: var(--divider-color);
      clip-path: url('#nub-border');
      z-index: 2;
    }

    &.top::after,
    &.bottom::after,
    &.top::before,
    &.bottom::before {
      left: 50%;
      margin-left: -9px;
    }
    &.top {
      bottom: 100%;
      &::after,
      &::before {
        bottom: -6px;
        transform: rotate(180deg);
      }
    }
    &.bottom {
      top: 100%;
      &::after,
      &::before {
        top: -7px;
      }
    }

    &.right::after,
    &.left::after,
    &.right::before,
    &.left::before {
      top: 50%;
      margin-top: -9px;
    }
    &.right {
      left: 100%;
      &::after,
      &::before {
        transform-origin: right top;
        left: -25px;
        transform: rotate(-90deg);
      }
    }
    &.left {
      right: 100%;
      &::after,
      &::before {
        transform-origin: left top;
        right: -25px;
        transform: rotate(90deg);
      }
    }
  }
  .no-arrow {
    box-shadow: 0px 0px 20px rgba(0, 0, 0, 0.75);
    &::after,
    &::before {
      content: none;
    }
  }
</style>
