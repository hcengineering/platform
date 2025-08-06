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
<script lang="ts">
  import { Label } from '@hcengineering/ui'
  import { IntlString } from '@hcengineering/platform'

  export let label: IntlString | undefined = undefined
  export let rawLabel: string | undefined = undefined
  export let value: string | number | undefined = undefined
</script>

<div class="state-row">
  <span class="text-normal content-color">
    {#if label !== undefined}
      <Label {label} />
    {:else}
      {rawLabel ?? ''}
    {/if}
  </span>
  {#if value !== undefined}
    <div class="flex justify-between flex-gap-2">
      <span class="text-normal content-color font-medium">{value}</span>
    </div>
  {/if}
</div>

<style lang="scss">
  .state-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: start;
    gap: 0.5rem;
    font-size: 0.85rem;
    padding: 0.15rem 0;
  }
</style>
