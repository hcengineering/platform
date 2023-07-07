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
  import type { AnySvelteComponent } from '@hcengineering/ui'
  import { Icon, tooltip } from '@hcengineering/ui'

  export let label: IntlString
  export let icon: Asset | AnySvelteComponent
  export let action: () => Promise<void>
  export let selected: boolean
  export let notify: boolean
</script>

<button class="app" class:selected id={'app-' + label} use:tooltip={{ label }} on:click|stopPropagation={action}>
  <div class="flex-center icon-container" class:noty={notify}>
    <Icon {icon} size={'large'} />
  </div>
  {#if notify}<div class="marker" />{/if}
</button>

<style lang="scss">
  .app {
    position: relative;
    padding: 0;
    width: 3.25rem;
    height: 3.25rem;
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    cursor: pointer;
    outline: none;

    .icon-container {
      width: 3.25rem;
      height: 3.25rem;
      color: var(--dark-color);

      .normal-font &.noty {
        clip-path: url(#notify-normal);
      }
      .small-font &.noty {
        clip-path: url(#notify-small);
      }
    }

    &:hover .icon-container {
      color: var(--caption-color);
    }
    &:focus {
      box-shadow: 0 0 0 2px var(--accented-button-outline);
      .icon-container {
        color: var(--caption-color);
      }
    }

    &.selected {
      background-color: var(--menu-bg-select);
      .icon-container {
        color: var(--theme-caption-color);
      }
    }
  }

  .marker {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background-color: var(--highlight-red);
  }
</style>
