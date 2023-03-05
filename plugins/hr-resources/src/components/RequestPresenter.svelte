<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { fromTzDate, Request, tzDateEqual } from '@hcengineering/hr'
  import { getClient } from '@hcengineering/presentation'
  import { DateRangePresenter, Label } from '@hcengineering/ui'

  export let value: Request | null | undefined
  export let noShift: boolean = false

  const client = getClient()

  $: type = value?.type !== undefined ? client.getModel().getObject(value?.type) : undefined
</script>

{#if type && value != null}
  <div class="flex-row-center gap-2">
    <div class="fs-title">
      <Label label={type.label} />
    </div>
    {#if value.tzDate && tzDateEqual(value.tzDate, value.tzDueDate)}
      <DateRangePresenter value={fromTzDate(value.tzDate)} {noShift} />
    {:else if value.tzDate}
      <DateRangePresenter value={fromTzDate(value.tzDate)} {noShift} />
      {#if value.tzDueDate}
        <DateRangePresenter value={fromTzDate(value.tzDueDate)} {noShift} />
      {/if}
    {/if}
  </div>
{/if}
