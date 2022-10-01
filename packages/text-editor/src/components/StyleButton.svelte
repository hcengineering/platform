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
  import type { Asset } from '@hcengineering/platform'
  import { AnySvelteComponent, Icon, IconSize, LabelAndProps, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let icon: Asset | AnySvelteComponent
  export let size: IconSize
  export let selected: boolean = false
  export let showTooltip: LabelAndProps | undefined = undefined
  export let disabled: boolean = false

  const dispatch = createEventDispatcher()
</script>

<button
  class="button {size}"
  class:selected
  {disabled}
  use:tooltip={showTooltip}
  tabindex="0"
  on:mousedown|preventDefault|stopPropagation={() => {
    dispatch('click')
  }}
>
  <div class="icon {size}">
    <Icon {icon} {size} />
  </div>
</button>

<style lang="scss">
  .button {
    color: inherit;
    border-radius: 0.125rem;
    cursor: pointer;
    padding: 0.75rem;

    .icon {
      color: var(--dark-color);
    }
    &:hover .icon {
      color: var(--accent-color);
      opacity: 1;
    }
    &:focus {
      border: 1px solid var(--primary-button-focused-border);
      box-shadow: 0 0 0 3px var(--primary-button-outline);
      .icon {
        color: var(--theme-caption-color);
        opacity: 1;
      }
    }
    &.selected {
      background-color: var(--button-bg-hover);
      border-color: var(--button-border-hover);
      color: var(--caption-color);

      .btn-icon {
        color: var(--accent-color);
      }
    }
  }
  .small {
    width: 1.143em;
    height: 1.143em;
  }
  .medium {
    width: 1.429em;
    height: 1.429em;
  }
  .large {
    width: 1.715em;
    height: 1.715em;
  }
</style>
