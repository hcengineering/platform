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
  import { Employee, EmployeeAccount, formatName } from '@hcengineering/contact'
  import { Account } from '@hcengineering/core'
  import { Avatar, createQuery } from '@hcengineering/presentation'
  import { showPopup } from '@hcengineering/ui'
  import { EditDoc } from '@hcengineering/view-resources'
  import contact from '../plugin'

  export let value: Account

  let employee: Employee | undefined

  async function onClick () {
    if (employee !== undefined) {
      showPopup(EditDoc, { _id: employee._id, _class: employee._class }, 'content')
    }
  }
  const query = createQuery()

  $: if (value._class === contact.class.EmployeeAccount) {
    query.query(contact.class.Employee, { _id: (value as EmployeeAccount).employee }, (r) => ([employee] = r))
  }
</script>

{#if value}
  <div class="flex-row-center" class:user-container={employee !== undefined} on:click={onClick}>
    {#if employee}
      <Avatar size={'x-small'} avatar={employee.avatar} />
      <div class="overflow-label user">{formatName(employee.name)}</div>
    {:else}
      <div class="overflow-label user">{value.email}</div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .user-container {
    cursor: pointer;

    .user {
      margin-left: 0.5rem;
      font-weight: 500;
      text-align: left;
      color: var(--theme-content-accent-color);
    }
    &:hover .user {
      text-decoration: underline;
      color: var(--theme-caption-color);
    }
  }
</style>
