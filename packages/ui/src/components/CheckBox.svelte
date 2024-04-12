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
  import { createEventDispatcher } from 'svelte'

  export let checked: boolean = false
  export let symbol: 'check' | 'minus' = 'check'
  export let size: 'small' | 'medium' | 'large' = 'small'
  export let circle: boolean = false
  export let kind: 'default' | 'primary' | 'positive' | 'negative' | 'todo' = 'default'
  export let color: string | undefined = undefined
  export let readonly: boolean = false

  const dispatch = createEventDispatcher()

  $: oldChecked = checked

  const handleValueChanged = (event: Event): void => {
    if (readonly) {
      return
    }
    const eventTarget = event.target as HTMLInputElement
    const isChecked = eventTarget.checked

    if (oldChecked !== isChecked) {
      oldChecked = isChecked
      dispatch('value', isChecked)
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<label
  style:--checkbox-color={color ?? 'var(--global-accent-TextColor)'}
  class="checkbox-container {size} {kind} {symbol}"
  class:colored={color !== undefined}
  class:circle
  class:readonly
  class:checked
  on:click|stopPropagation
>
  <input class="chBox" disabled={readonly} type="checkbox" bind:checked on:change|capture={handleValueChanged} />
  <div class="checkSVG" />
</label>

<style lang="scss">
  .checkbox-container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;

    .checkSVG {
      position: relative;

      &::after {
        position: absolute;
        inset: 0;
      }
    }
    &:not(.readonly):hover {
      cursor: pointer;
    }

    &.default,
    &.primary,
    &.positive,
    &.negative {
      .checkSVG {
        background-color: var(--theme-button-hovered);
        border: 1px solid var(--theme-checkbox-border);

        &::after {
          background-color: var(--theme-checkbox-color);
        }
      }
      &.check .checkSVG::after {
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' style='enable-background:new 0 0 14 14' xml:space='preserve'%3E%3Cpath d='M6 10.2 2.7 7l1-.9L6 8.4l4.5-4.6.9 1z'/%3E%3C/svg%3E%0A");
      }
      &.minus .checkSVG::after {
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' style='enable-background:new 0 0 14 14' xml:space='preserve'%3E%3Cpath d='M3 6.4h8v1.2H3z'/%3E%3C/svg%3E%0A");
      }
      &.small .checkSVG {
        width: 0.875rem;
        height: 0.875rem;
      }
      &.medium .checkSVG {
        width: 1rem;
        height: 1rem;
      }
      &.large .checkSVG {
        width: 1.25rem;
        height: 1.25rem;
      }
      &.circle .checkSVG {
        width: 1rem;
        height: 1rem;
        border-radius: 50%;
      }
      &:not(.circle) .checkSVG {
        border-radius: 0.25rem;
      }
      &.checked .checkSVG {
        background-color: var(--theme-checkbox-bg-color);

        &::after {
          content: '';
        }
      }
      &.readonly .checkSVG {
        background-color: var(--theme-checkbox-disabled);
      }
    }
    &.default.readonly,
    &.primary,
    &.positive,
    &.negative {
      .checkSVG::after {
        background-color: var(--primary-button-color);
      }
    }

    &.primary {
      .checkSVG {
        border-color: var(--primary-button-default);
      }
      &:not(.readonly).checked .checkSVG {
        background-color: var(--primary-button-default);
      }
    }
    &.positive {
      .checkSVG {
        border-color: var(--positive-button-default);
      }
      &:not(.readonly).checked .checkSVG {
        background-color: var(--positive-button-default);
      }
    }
    &.negative {
      .checkSVG {
        border-color: var(--negative-button-default);
      }
      &:not(.readonly).checked .checkSVG {
        background-color: var(--negative-button-default);
      }
    }

    &.todo {
      width: var(--global-extra-small-Size);
      height: var(--global-extra-small-Size);
      border-radius: 50%;

      .checkSVG {
        height: var(--global-min-Size);
        width: var(--global-min-Size);
        border: 1px solid var(--global-tertiary-TextColor);
        border-radius: 50%;

        &::after {
          background-color: var(--global-tertiary-TextColor);
          mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' style='enable-background:new 0 0 16 16' xml:space='preserve'%3E%3Cpath d='M11.6 5.5c.2.2.2.6 0 .8l-4.3 4.3c-.2.2-.6.2-.8 0l-2.1-2c-.2-.2-.2-.6 0-.8.2-.2.6-.2.8 0l1.7 1.7 3.9-3.9c.2-.3.6-.3.8-.1z' style='fill-rule:evenodd;clip-rule:evenodd;fill:%23072790'/%3E%3C/svg%3E%0A");
        }
      }
      &:focus-within {
        border-radius: 0.25rem;
        box-shadow: 0 0 0 0.125rem var(--global-focus-inset-BorderColor);
        outline: 0.125rem solid var(--global-focus-BorderColor);
        outline-offset: 0.125rem;
      }
      &:not(.readonly):hover {
        background-color: var(--button-secondary-hover-BackgroundColor);
      }
      &:not(.readonly):hover,
      &.checked {
        .checkSVG::after {
          content: '';
        }
      }
      &.colored .checkSVG {
        border-color: var(--checkbox-color);

        &::after {
          background-color: var(--checkbox-color);
        }
      }
      &.readonly .checkSVG,
      &.checked .checkSVG {
        border: none;
      }
      &.readonly {
        .checkSVG::before {
          position: absolute;
          content: '';
          inset: 0;
          background-color: var(--global-tertiary-TextColor);
          mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' style='enable-background:new 0 0 16 16' xml:space='preserve'%3E%3Cpath d='M15.3 11.4c-.5-.2-1.1-.1-1.4.3-.1.1-.1.2-.2.2-.5.7-1.2 1.4-1.9 1.8-.4.3-.6 1-.3 1.4 1.6-.7 2.9-2 3.8-3.7zM.4 10.5c.6-.2.9-.7.8-1.2-.1-.4-.1-.9-.1-1.3s0-.9.1-1.3c.1-.5-.2-1-.8-1.2-.3.9-.4 1.8-.4 2.6s.1 1.6.4 2.4zm3.5 3.2c-.7-.5-1.3-1.1-1.8-1.8-.3-.4-1-.6-1.4-.3.7 1.5 2 2.8 3.5 3.6.4-.6.3-1.2-.3-1.5zm5.3 1.1c-.9.1-1.7.1-2.7 0-.5-.1-1.1.2-1.3.8.9.3 1.7.4 2.7.4.9 0 1.7-.1 2.5-.4-.2-.6-.6-.9-1.2-.8zm5.6-8.2c.1.4.1 1 .1 1.5 0 .4 0 .7-.1 1.2s.2 1.1.9 1.2c.2-.8.3-1.6.3-2.4 0-1-.2-1.8-.4-2.7-.6 0-.9.6-.8 1.2zM6.4 1.2h.2c.9-.2 1.7-.2 2.7 0 .5.1 1.1-.2 1.2-.7C9.7.2 8.9 0 8 0 7 0 6.2.1 5.4.4c.1.5.6.8 1 .8zM.9 4.5c.2.1.3.1.5.1.3 0 .6-.2.9-.4l.1-.1c.5-.6 1.1-1.3 1.7-1.7.4-.4.6-1 .3-1.4-1.5.6-2.8 1.9-3.5 3.5zm10.9-2.3.2.1c.6.4 1.3 1.1 1.7 1.7.2.3.5.4.9.4.2 0 .3-.1.5-.1-.7-1.5-2-2.8-3.6-3.5-.3.5-.2 1.1.3 1.4z'/%3E%3C/svg%3E%0A");
          z-index: 1;
        }
        &.colored .checkSVG::before,
        &.checked .checkSVG::before {
          background-color: var(--checkbox-color);
        }
        &.checked .checkSVG::after {
          background-color: var(--checkbox-color);
        }
      }
      &.checked:not(.readonly) .checkSVG {
        background-color: var(--checkbox-color);
      }
      &.checked .checkSVG::after {
        background-color: var(--global-subtle-BackgroundColor);
      }
    }

    .chBox {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      border: 0;
      padding: 0;
      clip: rect(0 0 0 0);
      overflow: hidden;
    }
  }
</style>
