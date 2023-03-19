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
  import { Employee, EmployeeAccount, getName } from '@hcengineering/contact'
  import { Account } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Avatar, createQuery } from '@hcengineering/presentation'
  import { showPopup, tooltip } from '@hcengineering/ui'
  import { EditDoc } from '@hcengineering/view-resources'
  import DocNavLink from '@hcengineering/view-resources/src/components/DocNavLink.svelte'
  import contact from '../plugin'

  export let value: Account
  export let disabled = false

  let employee: Employee | undefined

  async function onClick () {
    if (employee !== undefined && !disabled) {
      showPopup(EditDoc, { _id: employee._id, _class: employee._class }, 'content')
    }
  }
  const query = createQuery()

  $: if (value && value._class === contact.class.EmployeeAccount) {
    query.query(contact.class.Employee, { _id: (value as EmployeeAccount).employee }, (r) => ([employee] = r))
  }
</script>

{#if value}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <DocNavLink object={value} disableClick={disabled} noUnderline={disabled} {onClick}>
    <span class="flex-row-center" use:tooltip={{ label: getEmbeddedLabel(employee ? getName(employee) : value.email) }}>
      {#if employee}
        <Avatar size={'x-small'} avatar={employee.avatar} />
        <span class="overflow-label user">{getName(employee)}</span>
      {:else}
        <span class="overflow-label user">{value.email}</span>
      {/if}
    </span>
  </DocNavLink>
{/if}

<style lang="scss">
  .user {
    margin-left: 0.5rem;
    font-weight: 500;
    text-align: left;
  }
</style>
