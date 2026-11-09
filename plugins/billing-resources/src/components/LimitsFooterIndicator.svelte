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
  import { Button, IconError, IconInfo, showPopup } from '@hcengineering/ui'
  import billing from '../plugin'
  import { restrictionStore } from '../stores/restriction'
  import LimitsFooterPopup from './LimitsFooterPopup.svelte'

  let wrapperEl: HTMLDivElement

  $: state = $restrictionStore
  $: isRestricted = state.mode === 'restricted'
  $: visible = state.mode !== 'ok'

  function handleClick (): void {
    showPopup(LimitsFooterPopup, {}, wrapperEl)
  }
</script>

{#if visible}
  <div class="limits-footer-wrapper" bind:this={wrapperEl}>
    <Button
      kind={'warning'}
      size="medium"
      icon={isRestricted ? IconError : IconInfo}
      label={billing.string.LimitsExceededShort}
      justify="left"
      width="100%"
      on:click={handleClick}
    />
  </div>
{/if}

<style lang="scss">
  .limits-footer-wrapper {
    margin: 0.5rem 0.75rem;
  }
</style>
