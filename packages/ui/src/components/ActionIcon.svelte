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
  import type { AnySvelteComponent, TooltipAligment } from '../types'

  import Icon from './Icon.svelte'
  import Tooltip from './Tooltip.svelte'

  export let label: IntlString = '' as IntlString
  export let direction: TooltipAligment | undefined = undefined
  export let icon: Asset | AnySvelteComponent
  export let size: 'small' | 'medium' | 'large'
  export let action: (ev?: Event) => Promise<void> | void = async () => { }
  export let invisible: boolean = false
</script>

<Tooltip {label} {direction}>
  <button class="button {size}" on:click|stopPropagation={action}>
    <div class="icon {size}" class:invisible={invisible}>
      <Icon {icon} {size}/>
    </div>
  </button>
</Tooltip>

<style lang="scss">
  .button {
    color: inherit;
    border-radius: .125rem;
    cursor: pointer;

    .icon {
      &.invisible { opacity: 0; }
    }
    &:hover .icon {
      color: var(--theme-caption-color);
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
