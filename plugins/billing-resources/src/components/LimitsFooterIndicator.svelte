<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { Icon, IconError, IconInfo, Label, tooltip } from '@hcengineering/ui'
  import billing from '../plugin'
  import { restrictionStore } from '../stores/restriction'
  import { upgradePlan } from '../utils'
  import LimitsFooterPopup from './LimitsFooterPopup.svelte'

  $: state = $restrictionStore
  $: isWarning = state.mode === 'warning'
  $: isRestricted = state.mode === 'restricted'
  $: visible = isWarning || isRestricted

  $: gracePeriodEndsAtDate = state.gracePeriodEndsAt !== undefined ? new Date(state.gracePeriodEndsAt) : undefined
  $: formattedDate =
    gracePeriodEndsAtDate !== undefined
      ? gracePeriodEndsAtDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      : ''

  function handleClick (): void {
    void upgradePlan()
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="antiNav-element limits-footer"
    class:warning={isWarning}
    class:restricted={isRestricted}
    use:tooltip={{ component: LimitsFooterPopup, direction: 'top' }}
    on:click={handleClick}
  >
    <div class="an-element__icon">
      {#if isRestricted}
        <Icon icon={IconError} size={'small'} />
      {:else}
        <Icon icon={IconInfo} size={'small'} />
      {/if}
    </div>
    <span class="an-element__label">
      {#if isRestricted}
        <Label label={billing.string.LimitExceededRestrictedTitle} />
      {:else}
        <Label label={billing.string.LimitExceededWarningTitle} params={{ date: formattedDate }} />
      {/if}
    </span>
  </div>
{/if}

<style lang="scss">
  .limits-footer {
    &.warning .an-element__icon {
      color: var(--theme-warning-color, var(--theme-content-color));
    }
    &.restricted .an-element__icon {
      color: var(--theme-error-color, var(--theme-content-color));
    }
    &.restricted .an-element__label {
      color: var(--theme-error-color, var(--theme-caption-color));
    }
  }
</style>
