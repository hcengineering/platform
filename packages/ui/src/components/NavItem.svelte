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
  import { Icon, Label, IconOpenedArrow, Fold, AnySvelteComponent, IconSize } from '..'

  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let iconProps: any | undefined = undefined
  export let iconSize: IconSize = 'small'
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let description: string | undefined = undefined
  export let type: 'type-link' | 'type-tag' | 'type-anchor-link' | 'type-object' = 'type-link'
  export let color: string | null = null
  export let count: number | null = null
  export let selected: boolean = false
  export let isFold: boolean = false
  export let isOpen: boolean = false
  export let isSecondary: boolean = false
  export let withBackground: boolean = false
  export let showMenu: boolean = false
  export let empty: boolean = false
  export let level: number = 1
</script>

<button
  class="hulyNavItem-container {type} {type === 'type-anchor-link' || isSecondary
    ? 'font-regular-12'
    : 'font-regular-14'}"
  class:fold={isFold}
  class:selected
  class:showMenu
  on:click
  on:contextmenu
>
  {#if isFold}
    <Fold {isOpen} {empty} {level} />
  {/if}
  {#if icon || (type === 'type-tag' && color)}
    <div class="hulyNavItem-icon" class:withBackground class:w-auto={iconSize === 'x-small'}>
      {#if type !== 'type-tag' && icon}
        <Icon {icon} size={iconSize} {iconProps} />
      {:else if type === 'type-tag'}
        <div style:background-color={color} class="hulyNavItem-icon__tag" />
      {/if}
    </div>
  {/if}
  <span
    class="hulyNavItem-label"
    class:font-medium-12={description}
    class:flex-grow={!(type === 'type-anchor-link' || description)}
    style:color={type === 'type-tag' && selected ? color : null}
  >
    {#if label}<Label {label} />{/if}
    {#if title}{title}{/if}
    <slot />
  </span>
  {#if description}
    <span class="hulyNavItem-label description flex-grow">{description}</span>
  {/if}
  {#if showMenu || $$slots.actions}
    <div class="hulyNavItem-actions">
      <slot name="actions" />
    </div>
  {/if}
  {#if count !== null}
    <span class="hulyNavItem-count font-regular-12">
      {count}
    </span>
  {/if}
  <slot name="notify" />
  {#if selected && (type === 'type-link' || type === 'type-object')}
    <div class="hulyNavItem-icon right"><IconOpenedArrow size={'small'} /></div>
  {/if}
</button>

<style lang="scss">
  .hulyNavItem-container {
    display: flex;
    justify-content: stretch;
    align-items: center;
    padding: 0;
    min-width: 0;
    min-height: var(--global-small-Size);
    border: none;
    border-radius: var(--small-BorderRadius);
    outline: none;

    .hulyNavItem-icon {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      width: var(--global-min-Size);
      height: var(--global-min-Size);
      color: var(--global-primary-TextColor);

      &__tag {
        flex-shrink: 0;
        width: 0.625rem;
        height: 0.625rem;
        border-radius: var(--min-BorderRadius);
      }
      &.right {
        visibility: hidden;
        margin-left: var(--spacing-0_5);
        color: var(--global-accent-IconColor);
      }
      &:not(.right) {
        margin-right: var(--spacing-1);
      }
      &.withBackground {
        width: var(--global-extra-small-Size);
        height: var(--global-extra-small-Size);
        background: var(--global-ui-BackgroundColor);
        border: 1px solid var(--global-subtle-ui-BorderColor);
        border-radius: var(--extra-small-BorderRadius);
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

      &.description {
        font-size: 0.875rem;
        font-weight: 400;
      }
    }
    .hulyNavItem-label + .hulyNavItem-label {
      margin-left: var(--spacing-0_5);
    }
    .hulyNavItem-actions {
      display: none;
      align-items: center;
      flex-shrink: 0;
      min-width: 0;
      min-height: 0;
      gap: var(--spacing-0_25);
    }
    .hulyNavItem-count {
      margin-left: var(--spacing-1);
      color: var(--global-tertiary-TextColor);
    }
    &:not(.selected) .hulyNavItem-count {
      margin-right: var(--spacing-1);
    }
    &:not(.selected):hover,
    &:not(.selected).showMenu {
      background-color: var(--global-ui-hover-highlight-BackgroundColor);
    }
    &.selected {
      cursor: auto;
      background-color: var(--global-ui-highlight-BackgroundColor);

      &:not(.type-anchor-link) .hulyNavItem-label:not(.description) {
        font-weight: 700;
      }
      .hulyNavItem-count {
        color: var(--global-secondary-TextColor);
      }
    }

    &.type-link {
      padding: 0 var(--spacing-1_25);

      &.selected {
        &:not(.fold) {
          padding: 0 var(--spacing-0_75) 0 var(--spacing-1_25);
        }
        &.fold {
          padding: 0 var(--spacing-0_75) 0 var(--spacing-0_5);
        }
        .hulyNavItem-icon {
          color: var(--global-accent-TextColor);
        }
        .hulyNavItem-label:not(.description) {
          color: var(--global-accent-TextColor);
        }
        .hulyNavItem-icon.right {
          visibility: visible;
        }
      }
    }
    &.type-tag {
      padding: 0 var(--spacing-1_25);
    }
    &.type-object {
      padding: 0 var(--spacing-0_5) 0 var(--spacing-0_5);

      .hulyNavItem-icon {
        width: var(--global-extra-small-Size);
        height: var(--global-extra-small-Size);

        &:not(.right) {
          margin-right: var(--spacing-0_75);
          background-color: var(--global-ui-BackgroundColor);
          border-radius: var(--extra-small-BorderRadius);
        }
      }
      &.selected {
        .hulyNavItem-label:not(.description) {
          color: var(--global-accent-TextColor);
        }
        .hulyNavItem-icon {
          color: var(--global-accent-TextColor);

          &.right {
            visibility: visible;
          }
        }
      }
    }
    &.type-anchor-link {
      padding: 0 var(--spacing-1_5) 0 var(--spacing-1_25);
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
      padding-left: var(--spacing-0_5);

      :global(.hulyFold-container) {
        margin-right: var(--spacing-0_75);
      }
    }

    &:hover .hulyNavItem-actions,
    &.showMenu .hulyNavItem-actions {
      display: flex;
    }
  }
</style>
