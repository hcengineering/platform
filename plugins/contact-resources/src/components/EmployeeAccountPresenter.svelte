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
  import { EmployeeAccount } from '@hcengineering/contact'
  import core, { Account, systemAccountEmail } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Label, tooltip } from '@hcengineering/ui'
  import { employeeByIdStore } from '../utils'
  import Avatar from './Avatar.svelte'
  import EmployeePresenter from './EmployeePresenter.svelte'

  export let value: Account
  export let disabled = false
  export let inline = false

  $: employee = $employeeByIdStore.get((value as EmployeeAccount).employee)

  const valueLabel = value.email === systemAccountEmail ? core.string.System : getEmbeddedLabel(value.email)
</script>

{#if value}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  {#if employee}
    <EmployeePresenter value={employee} {disabled} {inline} />
  {:else}
    <div class="flex-row-center">
      <Avatar size="x-small" />
      <span class="overflow-label user" use:tooltip={{ label: valueLabel }}><Label label={valueLabel} /></span>
    </div>
  {/if}
{/if}

<style lang="scss">
  .user {
    color: var(--accent-color);
    margin-left: 0.5rem;
    font-weight: 500;
    text-align: left;
  }
</style>
