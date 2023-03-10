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

  export let icon: Asset | AnySvelteComponent
  export let iconProps: any = undefined
  export let size: IconSize
  export let selected: boolean = false
  export let showTooltip: LabelAndProps | undefined = undefined
  export let disabled: boolean = false
</script>

<button
  class="button {size}"
  class:selected
  {disabled}
  use:tooltip={showTooltip}
  tabindex="0"
  on:click|preventDefault|stopPropagation
>
  <Icon {icon} {size} {iconProps} />
</button>

<style lang="scss">
  .button {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.75rem;
    color: var(--dark-color);
    border-radius: 0.25rem;
    cursor: pointer;

    &:hover {
      color: var(--accent-color);
    }
    &:focus {
      color: var(--caption-color);
      border: 1px solid var(--primary-button-focused-border);
      box-shadow: 0 0 0 3px var(--primary-button-outline);
    }
    &.selected {
      background-color: var(--button-bg-color);
      border-color: var(--button-border-color);
      color: var(--accent-color);
    }
    &.small {
      width: 1.143em;
      height: 1.143em;
    }
    &.medium {
      width: 1.429em;
      height: 1.429em;
    }
    &.large {
      width: 1.715em;
      height: 1.715em;
    }
  }
</style>
