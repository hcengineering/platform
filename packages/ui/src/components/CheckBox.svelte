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
  export let readonly = false

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
<label class="checkbox {size} {kind}" class:circle class:readonly class:checked on:click|stopPropagation>
  <input class="chBox" disabled={readonly} type="checkbox" bind:checked on:change|capture={handleValueChanged} />
  <svg class="checkSVG" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" style:color>
    {#if kind === 'todo'}
      {#if readonly}
        <path
          class="todo-readonly"
          d="M15.735 10.049A8 8 0 0 0 16 8a8 8 0 0 0-.408-2.528 1 1 0 0 0-.725 1.16 7 7 0 0 1 0 2.735 1 1 0 0 0 .725 1.161q.079-.237.143-.48m-.58 1.532a1 1 0 0 0-1.333.308 7.05 7.05 0 0 1-1.933 1.933 1 1 0 0 0-.308 1.334 8.03 8.03 0 0 0 3.575-3.575m-4.627 4.011a1 1 0 0 0-1.16-.725 7 7 0 0 1-2.735 0 1 1 0 0 0-1.161.725A8 8 0 0 0 8 16a8 8 0 0 0 2.528-.408m-6.109-.436a1 1 0 0 0-.308-1.334 7.05 7.05 0 0 1-1.933-1.933 1 1 0 0 0-1.334-.308 8.03 8.03 0 0 0 3.575 3.575M.408 10.528a1 1 0 0 0 .725-1.16 7 7 0 0 1 0-2.735 1 1 0 0 0-.725-1.161A8 8 0 0 0 0 8a8 8 0 0 0 .408 2.528M.844 4.42a1 1 0 0 0 1.334-.308 7 7 0 0 1 1.933-1.933A1 1 0 0 0 4.42.844a8 8 0 0 0-.864.503A8.04 8.04 0 0 0 .845 4.42M5.472.408a1 1 0 0 0 1.16.725 7 7 0 0 1 2.735 0 1 1 0 0 0 1.161-.725A8 8 0 0 0 8 0a8 8 0 0 0-2.528.408m6.109.436a1 1 0 0 0 .308 1.334 7.05 7.05 0 0 1 1.933 1.933 1 1 0 0 0 1.334.308 8 8 0 0 0-.504-.864 8.04 8.04 0 0 0-3.071-2.71"
        />
      {:else}
        <circle class="todo-circle" cx="8" cy="8" r="7.5" />
        <path
          class="todo-check"
          d="M11.585 5.54c.22.22.22.576 0 .795l-4.312 4.313a.56.56 0 0 1-.796 0L4.415 8.585a.563.563 0 0 1 .795-.795l1.665 1.664L10.79 5.54c.22-.22.576-.22.795 0"
        />
      {/if}
    {:else if checked}
      {#if symbol === 'minus'}
        <rect
          class="check"
          class:primary={kind === 'primary'}
          class:positive={kind === 'positive'}
          class:negative={kind === 'negative'}
          x="4"
          y="7.4"
          width="8"
          height="1.2"
        />
      {:else}
        <polygon
          class="check"
          class:primary={kind === 'primary'}
          class:positive={kind === 'positive'}
          class:negative={kind === 'negative'}
          points="7.3,11.5 4,8.3 5,7.4 7.3,9.7 11.8,5.1 12.7,6.1 "
        />
      {/if}
    {/if}
  </svg>
</label>

<style lang="scss">
  .checkbox {
    flex-shrink: 0;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    background-color: var(--theme-button-hovered);
    border: 1px solid var(--theme-checkbox-border);
    border-radius: 0.25rem;

    &:not(.readonly):hover {
      cursor: pointer;
    }

    &.small {
      width: 0.875rem;
      height: 0.875rem;
    }
    &.medium {
      width: 1rem;
      height: 1rem;
    }
    &.large {
      width: 1.25rem;
      height: 1.25rem;
    }
    &.circle {
      width: 1rem;
      height: 1rem;
      border-radius: 50%;
    }
    & {
      &.checked {
        background-color: var(--theme-checkbox-bg-color);
      }
    }
    &.readonly {
      background-color: var(--theme-checkbox-disabled);
    }
    &.primary {
      border-color: var(--primary-button-default);
      &:not(.readonly).checked {
        background-color: var(--primary-button-default);
      }
    }
    &.positive {
      border-color: var(--positive-button-default);
      &:not(.readonly).checked {
        background-color: var(--positive-button-default);
      }
    }
    &.negative {
      border-color: var(--negative-button-default);
      &:not(.readonly).checked {
        background-color: var(--negative-button-default);
      }
    }
    &.todo {
      width: var(--global-extra-small-Size);
      height: var(--global-extra-small-Size);
      border: none;
      border-radius: 50%;
      background-color: transparent;

      &:focus-within {
        border-radius: 0.25rem;
        box-shadow: 0 0 0 0.125rem var(--global-focus-inset-BorderColor);
        outline: 0.125rem solid var(--global-focus-BorderColor);
        outline-offset: 0.125rem;

        .checkSVG {
          .todo-check {
            visibility: visible;
          }
        }
      }

      &:not(.readonly):hover {
        background-color: var(--button-secondary-hover-BackgroundColor);

        .checkSVG {
          .todo-check {
            visibility: visible;
          }
        }
      }

      &.checked {
        .checkSVG {
          color: var(--global-accent-TextColor);

          .todo-circle {
            fill: currentColor;
          }

          .todo-check {
            visibility: visible;
            fill: var(--global-subtle-BackgroundColor);
          }
        }
      }

      .checkSVG {
        height: var(--global-min-Size);
        width: var(--global-min-Size);
        border-radius: 50%;
        color: var(--global-tertiary-TextColor);

        .todo-readonly {
          fill: currentColor;
        }

        .todo-circle {
          stroke: currentColor;
        }

        .todo-check {
          visibility: hidden;
          fill: currentColor;
        }
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

      &:checked + .checkSVG {
        & .check {
          visibility: visible;
          fill: var(--theme-checkbox-color);

          &.primary,
          &.positive,
          &.negative {
            fill: var(--primary-button-color);
          }
        }
      }
      &:not(:disabled) + .checkSVG {
        cursor: pointer;
      }
      &:disabled + .checkSVG .check {
        fill: var(--primary-button-color);
      }
    }

    .checkSVG {
      width: 0.875rem;
      height: 0.875rem;

      .check {
        visibility: hidden;
        fill: var(--theme-checkbox-color);
      }
    }
  }
</style>
