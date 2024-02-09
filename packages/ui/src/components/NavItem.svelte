<!--
// Copyright © 2021, 2023 Anticrm Platform Contributors.
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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { Icon, Label, IconOpenedArrow, Fold } from '..'

  export let icon: Asset | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let type: 'type-link' | 'type-tag' | 'type-anchor-link' | 'type-object' = 'type-link'
  export let color: string | null = null
  export let count: number | null = null
  export let selected: boolean = false
  export let isFold: boolean = false
  export let isOpen: boolean = false
  export let empty: boolean = false
  export let level: number = 1
</script>

<button
  class="hulyNavItem-container {type} {type === 'type-anchor-link' ? 'font-regular-12' : 'font-regular-14'}"
  class:fold={isFold}
  class:selected
  on:click|stopPropagation
  on:contextmenu|preventDefault|stopPropagation
>
  {#if isFold}
    <Fold {isOpen} {empty} {level} />
  {/if}
  {#if icon || (type === 'type-tag' && color)}
    <div class="hulyNavItem-icon">
      {#if type !== 'type-tag' && icon}
        <Icon {icon} size={'small'} />
      {:else if type === 'type-tag'}
        <div style:background-color={color} class="hulyNavItem-icon__tag" />
      {/if}
    </div>
  {/if}
  <span class="hulyNavItem-label" style:color={type === 'type-tag' && selected ? color : null}>
    {#if label}<Label {label} />{/if}
    {#if title}{title}{/if}
  </span>
  {#if count !== null}
    <span class="hulyNavItem-count font-regular-12">
      {count}
    </span>
  {/if}
  {#if selected && type === 'type-link'}
    <div class="hulyNavItem-icon right"><IconOpenedArrow size={'small'} /></div>
  {/if}
</button>

<style lang="scss">
  .hulyNavItem-container {
    display: flex;
    justify-content: stretch;
    align-items: center;
    padding: 0;
    min-height: 2rem;
    border: none;
    border-radius: 0.375rem;
    outline: none;

    .hulyNavItem-icon {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      width: 1rem;
      height: 1rem;
      color: var(--global-primary-TextColor);

      &__tag {
        flex-shrink: 0;
        width: 0.625rem;
        height: 0.625rem;
        border-radius: var(--min-BorderRadius);
      }
      &.right {
        visibility: hidden;
        margin-left: 0.5rem;
        color: var(--global-accent-IconColor);
      }
      &:not(.right) {
        margin-right: 0.5rem;
      }
    }
    .hulyNavItem-label {
      white-space: nowrap;
      word-break: break-all;
      text-overflow: ellipsis;
      overflow: hidden;
      text-align: left;
      min-width: 0;
      color: var(--global-primary-TextColor);
    }
    .hulyNavItem-count {
      margin-left: 0.5rem;
      color: var(--global-tertiary-TextColor);
    }
    &:not(.selected):hover {
      background-color: var(--global-ui-hover-highlight-BackgroundColor);
    }
    &.selected {
      cursor: auto;
      background-color: var(--global-ui-highlight-BackgroundColor);

      &:not(.type-anchor-link) .hulyNavItem-label {
        font-weight: 700;
      }
      .hulyNavItem-count {
        color: var(--global-secondary-TextColor);
      }
    }

    &.type-link {
      padding: 0 0.625rem;

      .hulyNavItem-label {
        flex-grow: 1;
      }
      &.selected {
        &:not(.fold) {
          padding: 0 0.375rem 0 0.625rem;
        }
        &.fold {
          padding: 0 0.375rem 0 0.25rem;
        }
        .hulyNavItem-icon {
          color: var(--global-accent-TextColor);
        }
        .hulyNavItem-label {
          color: var(--global-accent-TextColor);
        }
        .hulyNavItem-icon.right {
          visibility: visible;
        }
      }
    }
    &.type-tag {
      padding: 0 0.625rem;

      .hulyNavItem-label {
        flex-grow: 1;
      }
    }
    &.type-object {
      padding: 0 0.625rem 0 0.25rem;

      .hulyNavItem-icon {
        width: 1.5rem;
        height: 1.5rem;
        background-color: var(--global-ui-BackgroundColor);
        border-radius: 0.25rem;

        &:not(.right) {
          margin-right: 0.375rem;
        }
      }
      .hulyNavItem-label {
        flex-grow: 1;
      }
      &.selected .hulyNavItem-label {
        color: var(--global-accent-TextColor);
      }
    }
    &.type-anchor-link {
      padding: 0 0.75rem 0 0.625rem;
      width: fit-content;
      min-height: 1.75rem;

      .hulyNavItem-icon,
      .hulyNavItem-label {
        color: var(--global-secondary-TextColor);
      }
      .hulyNavItem-label {
        font-weight: 500;
      }
      &.selected .hulyNavItem-icon,
      &.selected .hulyNavItem-label {
        color: var(--global-primary-TextColor);
      }
    }
    &.fold {
      padding-left: 0.25rem;

      :global(.hulyFold-container) {
        margin-right: 0.375rem;
      }
    }
  }
</style>
