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
  import { IconClose } from '..'

  const dispatch = createEventDispatcher()

  let buttonRef: HTMLButtonElement

  function handleBackspace (event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      dispatch('click')
    }
  }

  export function focus () {
    buttonRef.focus()
  }
</script>

<div class="flex items-center font-medium-14 max-w-60 chip">
  <span>
    <slot/>
  </span>
  <button
    bind:this={buttonRef}
    on:click
    on:keydown={handleBackspace}
  >
    <IconClose size="small"/>
  </button>
</div>

<style lang="scss">
  .chip {
    position: relative;
    height: var(--global-small-Size);
    border: none;
    padding: var(--spacing-0_5);
    color: var(--tag-on-accent-PorpoiseText);
    background-color: var(--global-accent-BackgroundColor);
    border-radius: var(--small-BorderRadius);
    
    &:after {
      content: "";
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

    span {
      padding: 0 var(--spacing-1);
      line-height: 2rem;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }

    button {
      margin-right: var(--spacing-0_25);
      color: inherit;
      border: 0;
      border-radius: var(--min-BorderRadius);

      &:hover,
      &:focus-within {
        background-color: var(--global-ui-hover-BackgroundColor);
      }

      &:active {
        background-color: var(--global-ui-active-BackgroundColor);
      }
    }
  }
</style>