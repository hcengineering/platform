<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { IconClose, ButtonIcon, LabelAndProps, tooltip as tp } from '..'

  export let label: string
  export let size: 'small' | 'min' = 'small'
  export let isRemovable: boolean = false
  export let backgroundColor: string | undefined = undefined
  export let tooltip: LabelAndProps | undefined = undefined

  const dispatch = createEventDispatcher()

  let buttonRef: ButtonIcon | undefined

  function handleBackspace (event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      dispatch('remove')
    }
  }

  export function focus () {
    buttonRef?.focus()
  }
</script>

<div
  class="flex items-center font-medium-14 max-w-60 chip {size}"
  class:removable={isRemovable}
  style:background-color={backgroundColor}
  use:tp={tooltip}
>
  <span class="px-2 overflow-label chip-label">{label}</span>
  {#if isRemovable}
    <ButtonIcon
      bind:this={buttonRef}
      kind="tertiary"
      size="min"
      icon={IconClose}
      inheritColor={true}
      on:click={() => dispatch('remove')}
      on:keydown={handleBackspace}
    />
  {/if}
</div>

<style lang="scss">
  .chip {
    position: relative;
    height: var(--global-small-Size);
    padding: var(--spacing-0_5);
    border: none;
    color: var(--tag-on-accent-PorpoiseText);
    background-color: var(--global-accent-BackgroundColor);
    border-radius: var(--small-BorderRadius);

    &.removable {
      &:after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: var(--small-BorderRadius);
        overflow: hidden;
        background-color: transparent;
        pointer-events: none;
      }

      &:hover:after {
        background-color: var(--global-ui-hover-OverlayColor);
      }

      &:active:after {
        background-color: var(--global-ui-active-OverlayColor);
      }
    }

    &.min {
      height: 1.25rem;
      padding: var(--spacing-0_25);
      border-radius: var(--extra-small-BorderRadius);
      font-size: 0.6875rem;

      .chip-label {
        padding: 0 var(--spacing-0_5);
      }
    }

    .chip-label {
      padding: 0 var(--spacing-1);
    }

    & :global(button.type-button-icon) {
      margin-right: var(--spacing-0_25);
    }
  }
</style>
