<!--
// Copyright © 2026 TraceX SAS.
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
  /** Makes the link a regular `<a>`. Without it a button is rendered, for actions that do not navigate. */
  export let href: string | undefined = undefined
  /** Opens the link in a new tab and shows a trailing arrow. Only applies together with `href`. */
  export let external: boolean = false
  export let disabled: boolean = false
  export let size: 'small' | 'medium' = 'small'
  export let dataId: string | undefined = undefined
</script>

{#if href !== undefined}
  <a
    class="text-link {size}"
    {href}
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
    data-id={dataId}
    on:click
  >
    <slot />
    {#if external}
      <svg class="arrow" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" />
      </svg>
    {/if}
  </a>
{:else}
  <button type="button" class="text-link {size}" {disabled} data-id={dataId} on:click>
    <slot />
  </button>
{/if}

<style lang="scss">
  .text-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0;
    border: none;
    border-radius: 0.125rem;
    background: none;
    font: inherit;
    font-weight: 400;
    line-height: 1.25;
    color: var(--theme-link-color);
    text-decoration: none;
    cursor: pointer;

    &.small {
      font-size: 0.8125rem;
    }
    &.medium {
      font-size: 0.875rem;
    }

    &:hover:not(:disabled) {
      text-decoration: underline;
    }
    &:focus-visible {
      outline: 2px solid var(--theme-link-color);
      outline-offset: 2px;
    }
    &:disabled {
      color: var(--theme-dark-color);
      cursor: default;
    }
  }

  .arrow {
    flex-shrink: 0;
    width: 0.75rem;
    height: 0.75rem;
    stroke: currentColor;
    stroke-width: 1.25;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
