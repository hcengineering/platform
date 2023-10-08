<!--
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
  import { floorFractionDigits, Label, tooltip } from '@hcengineering/ui'
  import tracker from '../../../plugin'

  export let id: string | undefined = undefined
  export let kind: 'link' | undefined = undefined
  export let value: number
  export let noSymbol: boolean = false
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<span
  {id}
  class:link={kind === 'link'}
  on:click
  use:tooltip={{
    component: Label,
    props: { label: tracker.string.TimeSpendHours, params: { value: floorFractionDigits(value, 2) } }
  }}
>
  {#if noSymbol}
    {floorFractionDigits(value, 2)}
  {:else if value > 0 && value < 8}
    <Label label={tracker.string.TimeSpendHours} params={{ value: floorFractionDigits(value, 2) }} />
  {:else}
    <Label label={tracker.string.TimeSpendValue} params={{ value: floorFractionDigits(value / 8, 3) }} />
  {/if}
</span>

<style lang="scss">
  .link {
    white-space: nowrap;

    font-size: 0.8125rem;
    color: var(--theme-content-color);
    cursor: pointer;

    &:hover {
      color: var(--theme-caption-color);
      text-decoration: underline;
    }
    &:active {
      color: var(--theme-accent-color);
    }
  }
</style>
