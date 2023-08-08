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
  import { Employee, PersonAccount } from '@hcengineering/contact'
  import core, { Account, Ref, systemAccountEmail } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { IconSize, Label, tooltip } from '@hcengineering/ui'
  import { employeeByIdStore, personAccountPersonByIdStore } from '../utils'
  import Avatar from './Avatar.svelte'
  import EmployeePresenter from './EmployeePresenter.svelte'
  import PersonPresenter from './PersonPresenter.svelte'

  export let value: Account
  export let avatarSize: IconSize = 'x-small'
  export let disabled: boolean = false
  export let inline: boolean = false
  export let accent: boolean = false

  $: employee = $employeeByIdStore.get((value as PersonAccount)?.person as Ref<Employee>)

  $: person = $personAccountPersonByIdStore.get((value as PersonAccount)?.person)
  const valueLabel = value?.email === systemAccountEmail ? core.string.System : getEmbeddedLabel(value?.email)
</script>

{#if value}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  {#if employee}
    <EmployeePresenter value={employee} {disabled} {inline} {accent} {avatarSize} on:accent-color />
  {:else if person}
    <PersonPresenter value={person} {disabled} {inline} {accent} {avatarSize} on:accent-color />
  {:else}
    <div class="flex-row-center">
      <Avatar size={avatarSize} />
      <span class="overflow-label user" class:fs-bold={accent} use:tooltip={{ label: valueLabel }}>
        <Label label={valueLabel} />
      </span>
    </div>
  {/if}
{/if}

<style lang="scss">
  .user {
    color: var(--theme-caption-color);
    margin-left: 0.5rem;
    text-align: left;
  }
</style>
