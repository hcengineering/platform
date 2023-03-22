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
  import { navigate, parseLocation } from '@hcengineering/ui'

  export let href: string | undefined
  export let disableClick = false
  export let onClick: ((event: MouseEvent) => void) | undefined = undefined
  export let noUnderline = false
  export let inline = false
  export let shrink: number = 0

  function clickHandler (e: MouseEvent) {
    if (disableClick) return
    if (onClick) {
      e.preventDefault()
      e.stopPropagation()
      onClick(e)
    } else if (href !== undefined) {
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

{#if disableClick || href === undefined}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <span
    class:cursor-pointer={!disableClick}
    class:noUnderline
    class:inline
    style:flex-shrink={shrink}
    on:click={clickHandler}
  >
    <slot />
  </span>
{:else}
  <a {href} class:noUnderline class:inline style:flex-shrink={shrink} on:click={clickHandler}>
    <slot />
  </a>
{/if}

<style lang="scss">
  span,
  a {
    display: flex;
    align-items: center;
    min-width: 0;
    color: var(--accent-color);
    // overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    cursor: pointer;
    font-weight: inherit;

    &.inline {
      display: inline-flex;
      align-items: center;
    }

    &.noUnderline {
      color: var(--caption-color);
      font-weight: 500;
    }

    &:not(.noUnderline) {
      &:hover {
        color: var(--caption-color);
        text-decoration: underline;
      }
    }

    &:active {
      color: var(--accent-color);
    }
  }
</style>
