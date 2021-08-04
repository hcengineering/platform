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
  import type { IntlString, Asset } from '@anticrm/platform'
  import type { AnySvelteComponent } from '../types'

  import Icon from './Icon.svelte'
  import Tooltip from './Tooltip.svelte'

  export let label: IntlString
  export let direction: string = 'top'
  export let icon: Asset | AnySvelteComponent
  export let size: 'small' | 'medium' | 'large'
  export let action: () => Promise<void>
  export let invisible: boolean = false
</script>

<Tooltip label={label} direction={direction}>
  <button class="button {size}" on:click|stopPropagation={action}>
    <div class="icon {size}" class:invisible={invisible}>
      {#if typeof (icon) === 'string'}
        <Icon {icon} {size}/>
      {:else}
        <svelte:component this={icon} size={size} />
      {/if}
    </div>
  </button>
</Tooltip>

<style lang="scss">
  .button {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 4px;
    outline: none;
    background-color: transparent;
    cursor: pointer;

    .icon {
      opacity: .3;
      &.invisible {
        opacity: 0;
      }
    }
    &:hover .icon {
      opacity: 1;
    }
    &:focus {
      border: 1px solid var(--primary-button-focused-border);
      box-shadow: 0 0 0 3px var(--primary-button-outline);
      .icon {
        opacity: 1;
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
    width: 1.714em;
    height: 1.714em;
  }
</style>
