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
  import type { IntlString, Asset } from '@hcengineering/platform'
  import type { AnySvelteComponent, TooltipAlignment } from '../types'
  import { ComponentType } from 'svelte'

  import Icon from './Icon.svelte'
  import { tooltip } from '../tooltips'

  export let label: IntlString = '' as IntlString
  export let labelProps: any = undefined
  export let direction: TooltipAlignment | undefined = undefined
  export let icon: Asset | AnySvelteComponent | ComponentType
  export let iconProps: any | undefined = undefined
  export let size: 'x-small' | 'small' | 'medium' | 'large'
  export let action: (ev: MouseEvent) => Promise<void> | void = async () => {}
  export let invisible: boolean = false
  export let disabled: boolean = false
</script>

<button
  class="button {size}"
  use:tooltip={{ label, direction, props: labelProps }}
  tabindex="0"
  on:click|stopPropagation|preventDefault={action}
  {disabled}
>
  <div class="icon {size}" class:invisible>
    <Icon {icon} {size} {iconProps} />
  </div>
</button>

<style lang="scss">
  .button {
    color: inherit;
    border-radius: 0.125rem;
    cursor: pointer;

    .icon {
      color: var(--theme-halfcontent-color);
      &.invisible {
        opacity: 0;
      }
    }
    &:not(:disabled):hover .icon {
      color: var(--theme-caption-color);
      opacity: 1;
    }
    &:focus-visible {
      box-shadow: 0 0 0 2px var(--accented-button-outline);
      .icon {
        color: var(--theme-caption-color);
        opacity: 1;
      }
    }
    &:disabled {
      cursor: default;
    }
  }
  .small {
    width: 1rem;
    height: 1rem;
  }
  .medium {
    width: 1.25rem;
    height: 1.25rem;
  }
  .large {
    width: 1.5rem;
    height: 1.5rem;
  }
</style>
