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
  import { tooltipstore as tooltip } from '..'
  import type { TooltipAligment } from '..'
  import Label from './Label.svelte'

  let tooltipHTML: HTMLElement
  let dir: TooltipAligment

  $: {
    if ($tooltip.label && tooltipHTML) {
      if ($tooltip.element) {
        const rect = $tooltip.element.getBoundingClientRect()
        const doc = document.body.getBoundingClientRect()

        if (!$tooltip.direction) {
          if (rect.right < doc.width / 5) dir = 'right'
          else if (rect.left > doc.width - doc.width / 5) dir = 'left'
          else if (rect.top < tooltipHTML.clientHeight) dir = 'bottom'
          else dir = 'top'
        } else dir = $tooltip.direction

        if (dir === 'right') {
          tooltipHTML.style.top = rect.y + rect.height / 2 + 'px'
          tooltipHTML.style.left = `calc(${rect.right}px + .75rem)`
          tooltipHTML.style.transform = 'translateY(-50%)'
        } else if (dir === 'left') {
          tooltipHTML.style.top = rect.y + rect.height / 2 + 'px'
          tooltipHTML.style.right = `calc(${doc.width - rect.x}px + .75rem)`
          tooltipHTML.style.transform = 'translateY(-50%)'
        } else if (dir === 'bottom') {
          tooltipHTML.style.top = `calc(${rect.bottom}px + .5rem)`
          tooltipHTML.style.left = rect.x + rect.width / 2 + 'px'
          tooltipHTML.style.transform = 'translateX(-50%)'
        } else if (dir === 'top') {
          tooltipHTML.style.bottom = `calc(${doc.height - rect.y}px + .75rem)`
          tooltipHTML.style.left = rect.x + rect.width / 2 + 'px'
          tooltipHTML.style.transform = 'translateX(-50%)'
        }
        tooltipHTML.classList.remove('no-arrow')
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
</script>

{#if $tooltip.label}
  <div class="tooltip {dir}" bind:this={tooltipHTML}>
    <Label label={$tooltip.label} />
  </div>
{/if}

<style lang="scss">
  .tooltip {
    position: fixed;
    padding: .5rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-tooltip-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: .5rem;
    user-select: none;
    text-align: center;
    z-index: 10;

    &::after {
      content: '';
      position: absolute;
      width: .875rem;
      height: .875rem;
      background-color: var(--theme-tooltip-color);
      border: 1px solid var(--theme-bg-accent-color);
      border-radius: 0 0 3px;
      clip-path: polygon(100% 25%, 100% 100%, 25% 100%);
    }

    &.top::after,
    &.bottom::after {
      left: 50%;
      margin-left: -.5rem;
    }
    &.top {
      bottom: 100%;
      box-shadow: 0px 8px 20px rgba(0, 0, 0, .35);
      &::after {
        bottom: -.3125rem;
        transform: rotate(45deg);
      }
    }
    &.bottom {
      top: 100%;
      box-shadow: 0px -8px 20px rgba(0, 0, 0, .35);
      &::after {
        top: -.3125rem;
        transform: rotate(-135deg);
      }
    }

    &.right::after,
    &.left::after {
      top: 50%;
      margin-top: -.5rem;
    }
    &.right {
      left: 100%;
      box-shadow: -8px 0px 20px rgba(0, 0, 0, .35);
      &::after {
        left: -.3125rem;
        transform: rotate(135deg);
      }
    }
    &.left {
      right: 100%;
      box-shadow: 8px 0px 20px rgba(0, 0, 0, .35);
      &::after {
        right: -.3125rem;
        transform: rotate(-45deg);
      }
    }
  }
  .no-arrow {
    box-shadow: 0px 0px 20px rgba(0, 0, 0, .75);
    &::after {
      content: none;
    }
  }
</style>
