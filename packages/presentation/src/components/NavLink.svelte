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
  import { closePopup, closeTooltip, navigate, parseLocation } from '@hcengineering/ui'

  export let href: string | undefined
  export let disabled = false
  export let onClick: ((event: MouseEvent) => void) | undefined = undefined
  export let noUnderline = disabled
  export let inline = false
  export let colorInherit: boolean = false
  export let shrink: number = 1
  export let accent: boolean = false

  function clickHandler (e: MouseEvent) {
    if (disabled) return

    if (onClick) {
      e.preventDefault()
      e.stopPropagation()
      onClick(e)
    } else if (href !== undefined) {
      if (e.metaKey || e.ctrlKey) return

      // we need to close popups and tooltips
      closePopup()
      closeTooltip()
      try {
        const url = new URL(href)

        if (url.origin === window.location.origin) {
          e.preventDefault()
          navigate(parseLocation(url))
        }
      } catch {}
    }
  }
</script>

{#if disabled || href === undefined}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <span
    class:cursor-pointer={!disabled}
    class:noUnderline
    class:inline
    class:colorInherit
    class:fs-bold={accent}
    style:flex-shrink={shrink}
    on:click={clickHandler}
  >
    <slot />
  </span>
{:else}
  <a
    {href}
    class:noUnderline
    class:inline
    class:colorInherit
    class:fs-bold={accent}
    style:flex-shrink={shrink}
    on:click={clickHandler}
  >
    <slot />
  </a>
{/if}

<style lang="scss">
  span,
  a {
    display: flex;
    align-items: center;
    min-width: 0;
    // overflow: hidden;
    white-space: nowrap;
    word-break: break-all;
    text-overflow: ellipsis;
    font-weight: inherit;

    &:not(.colorInherit) {
      color: var(--theme-content-color);
    }
    &.colorInherit {
      color: inherit;
    }
    &.inline {
      display: inline-flex;
      align-items: center;
    }

    &.noUnderline {
      &:not(.colorInherit) {
        color: var(--theme-caption-color);
      }
    }

    &:not(.noUnderline) {
      &:hover {
        text-decoration: underline;
        &:not(.colorInherit) {
          color: var(--theme-caption-color);
        }
      }
    }

    &:active {
      color: var(--theme-content-color);
    }
  }
</style>
