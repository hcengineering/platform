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
  import { IconClose, ButtonIcon } from '..'

  export let label: string

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

<div class="flex items-center font-medium-14 max-w-60 p-1 chip">
  <span class="px-2 overflow-label">{label}</span>
  <ButtonIcon
    bind:this={buttonRef}
    kind="tertiary"
    size="min"
    icon={IconClose}
    inheritColor={true}
    on:click={() => dispatch('remove')}
    on:keydown={handleBackspace}
  />
</div>

<style lang="scss">
  .chip {
    position: relative;
    height: var(--global-small-Size);
    border: none;
    color: var(--tag-on-accent-PorpoiseText);
    background-color: var(--global-accent-BackgroundColor);
    border-radius: var(--small-BorderRadius);

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

    & :global(button.type-button-icon) {
      margin-right: var(--spacing-0_25);
    }
  }
</style>
