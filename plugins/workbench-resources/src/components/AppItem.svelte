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
  import { Icon, Tooltip } from '@anticrm/ui'

  export let label: IntlString
  export let icon: Asset
  export let action: () => Promise<void>
  export let selected: boolean
  export let notify: boolean
</script>

<button class="border-box relative p-0 w-15 h-15 rounded-lg border border-transparent bg-transparent cursor-pointer outline-none app" class:selected={selected} on:click={action}>
  <Tooltip label={label} direction="right">
    <div class="flex justify-center items-center w-15 h-15 opacity-30 icon-container" class:noty={notify}>
      <Icon icon={icon} size={'large'}/>
    </div>
  </Tooltip>
  {#if notify}
    <div class="absolute top-4 right-4 w-2 h-2 rounded-full background-highlight-red"/>
  {/if}
</button>

<style lang="scss">
  .app {
    .icon-container {
      .normal-font &.noty {
        clip-path: url(#notify-normal);
      }
      .small-font &.noty {
        clip-path: url(#notify-small);
      }
    }
    &:hover .icon-container {
      opacity: 1;
    }
    &:focus {
      border: 1px solid var(--primary-button-focused-border);
      box-shadow: 0 0 0 3px var(--primary-button-outline);
      .icon-container {
        opacity: 1;
      }
    }
    &.selected {
      background-color: var(--theme-menu-selection);
      .icon-container {
        opacity: 1;
      }
    }
  }
</style>