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

<button class="app" class:selected={selected} on:click={action}>
  {#if notify}
    <div class="marker"/>
  {/if}
  <Tooltip label={label} direction="right">
    <div class="container" class:noty={notify}>
      <Icon icon={icon} size={'large'}/>
    </div>
  </Tooltip>
</button>

<style lang="scss">
  .app {
    position: relative;
    padding: 0;
    width: 48px;
    height: 48px;
    min-width: 48px;
    min-height: 48px;
    border-radius: 8px;
    border: 1px solid transparent;
    outline: none;
    background-color: transparent;
    cursor: pointer;

    .marker {
      position: absolute;
      top: 14px;
      left: 28px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--highlight-red);
    }
    .container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 48px;
      height: 48px;
      opacity: .3;
      &.noty {
        clip-path: url(#notify);
      }
    }
    &:hover .container {
      opacity: 1;
    }
    &:focus {
      border: 1px solid var(--primary-button-focused-border);
      box-shadow: 0 0 0 3px var(--primary-button-outline);
      .container {
        opacity: 1;
      }
    }
    &.selected {
      background-color: var(--theme-menu-selection);
      .container {
        opacity: 1;
      }
    }
  }
</style>