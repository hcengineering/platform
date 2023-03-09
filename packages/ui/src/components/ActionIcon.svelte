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

  import Icon from './Icon.svelte'
  import { tooltip } from '../tooltips'

  export let label: IntlString = '' as IntlString
  export let labelProps: any = undefined
  export let direction: TooltipAlignment | undefined = undefined
  export let icon: Asset | AnySvelteComponent
  export let iconProps: any | undefined = undefined
  export let size: 'x-small' | 'small' | 'medium' | 'large'
  export let action: (ev: MouseEvent) => Promise<void> | void = async () => {}
  export let invisible: boolean = false
</script>

<button
  class="button {size}"
  use:tooltip={{ label, direction, props: labelProps }}
  tabindex="0"
  on:click|stopPropagation|preventDefault={action}
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
      color: var(--dark-color);
      &.invisible {
        opacity: 0;
      }
    }
    &:hover .icon {
      color: var(--accent-color);
      opacity: 1;
    }
    &:focus {
      border: 1px solid var(--primary-button-focused-border);
      box-shadow: 0 0 0 3px var(--primary-button-outline);
      .icon {
        color: var(--caption-color);
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
    width: 1.715em;
    height: 1.715em;
  }
</style>
