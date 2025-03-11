<!--
// Copyright © 2025 Hardcore Engineering Inc.
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

<!--TODO: implement button by figma-->
<script lang="ts">
  import { LabelAndProps, tooltip as showTooltip } from '@hcengineering/ui'
  import { IntlString } from '@hcengineering/platform'

  import Icon from './Icon.svelte'
  import Label from './Label.svelte'
  import { IconSize, ButtonSize, ButtonType, ButtonVariant, IconComponent } from '../types'

  export let id: string | undefined = undefined
  export let icon: IconComponent | undefined = undefined
  export let iconSize: IconSize | undefined = 'small'
  export let label: string | undefined = undefined
  export let labelIntl: IntlString | undefined = undefined
  export let labelParams: Record<string, any> = {}
  export let disabled: boolean = false
  export let buttonType: ButtonType = ButtonType.Button
  export let size: ButtonSize = ButtonSize.Auto
  export let variant: ButtonVariant = ButtonVariant.Default
  export let tooltip: LabelAndProps | undefined = undefined
</script>

<button
  class="button {variant} {size}"
  class:disabled
  class:no-label={label == null && labelIntl == null}
  class:no-icon={icon == null}
  {id}
  type={buttonType}
  {disabled}
  on:click
  use:showTooltip={tooltip}
>
  {#if icon}
    <div class="button__icon" class:disabled>
      <Icon {icon} size={iconSize} />
    </div>
  {/if}
  {#if label}
    {label}
  {:else if labelIntl}
    <Label label={labelIntl} params={labelParams} />
  {/if}
</button>

<style lang="scss">
  .button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    border: 0;
    color: var(--next-text-color-primary);
    width: fit-content;
    cursor: pointer;
    border-radius: 0.313rem;

    &.medium {
      width: var(--button-size-medium);
      height: var(--button-size-medium);
    }

    &.default {
      padding: 0.25rem;
      gap: 0.25rem;
      background: var(--button-color-foreground);
      color: var(--next-text-color-primary);
    }

    &.ghost {
      gap: 0.25rem;
      padding: 0.25rem;
      background: transparent;

      &.no-label {
        padding-right: 0.125rem;
      }

      &.no-icon {
        padding-left: 0.25rem;
      }
    }

    &:not(.disabled, :disabled):hover {
      /*TODO: color from theme*/
      background: rgba(54, 55, 61, 0.12);
    }

    &:not(.disabled, :disabled):active {
      /*TODO: color from theme*/
      background: #b9b9b9;
    }

    &.disabled {
      cursor: not-allowed;
    }
  }

  .button__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.125rem;
  }
</style>
