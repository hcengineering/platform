<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import contact, { Employee, EmployeeAccount } from '@anticrm/contact'
  import { Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import { Department, Staff } from '@anticrm/hr'
  import { Avatar, createQuery, MessageBox, getClient, UsersPopup } from '@anticrm/presentation'
  import { Scroller, Panel, Button, showPopup, eventToHTMLElement } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import StaffPresenter from './StaffPresenter.svelte'
  import hr from '../plugin'

  export let _id: Ref<Department> | undefined
  let value: Department | undefined
  let employees: WithLookup<Staff>[] = []
  let accounts: EmployeeAccount[] = []

  const dispatch = createEventDispatcher()

  const departmentQuery = createQuery()
  const query = createQuery()
  const accountsQuery = createQuery()
  const client = getClient()

  $: _id &&
    value === undefined &&
    departmentQuery.query(
      hr.class.Department,
      {
        _id
      },
      (res) => ([value] = res)
    )

  $: value &&
    accountsQuery.query(
      contact.class.EmployeeAccount,
      {
        _id: { $in: value.members as Ref<EmployeeAccount>[] }
      },
      (res) => {
        accounts = res
      }
    )

  $: accounts.length &&
    query.query(
      hr.mixin.Staff,
      {
        _id: { $in: accounts.map((p) => p.employee) as Ref<Staff>[] }
      },
      (res) => {
        employees = res
      },
      {
        sort: {
          name: SortingOrder.Descending
        },
        lookup: {
          department: hr.class.Department
        }
      }
    )

  function add (e: MouseEvent) {
    showPopup(
      UsersPopup,
      {
        _class: contact.class.Employee,
        ignoreUsers: employees.filter((p) => p.department === _id).map((p) => p._id)
      },
      eventToHTMLElement(e),
      addMember
    )
  }

  async function addMember (employee: Employee | undefined): Promise<void> {
    if (employee === undefined || value === undefined) {
      return
    }

    const hierarchy = client.getHierarchy()
    if (!hierarchy.hasMixin(employee, hr.mixin.Staff)) {
      await client.createMixin(employee._id, employee._class, employee.space, hr.mixin.Staff, {
        department: value._id
      })
    } else {
      const staff = hierarchy.as(employee, hr.mixin.Staff)
      if (staff.department === value._id) return
      const current = await client.findOne(hr.class.Department, {
        _id: staff.department
      })
      if (current !== undefined) {
        showPopup(
          MessageBox,
          {
            label: hr.string.MoveStaff,
            message: hr.string.MoveStaffDescr,
            params: {
              current: current.name,
              department: value.name
            }
          },
          undefined,
          async (res?: boolean) => {
            if (res === true && value !== undefined) {
              await client.updateMixin(employee._id, employee._class, employee.space, hr.mixin.Staff, {
                department: value._id
              })
            }
          }
        )
      } else {
        await client.updateMixin(employee._id, employee._class, employee.space, hr.mixin.Staff, {
          department: value._id
        })
      }
    }
  }
</script>

<Panel
  isHeader={true}
  isAside={false}
  isFullSize
  on:fullsize
  on:close={() => {
    dispatch('close')
  }}
>
  <svelte:fragment slot="title">
    <div class="antiTitle icon-wrapper">
      {#if value}
        <div class="wrapped-icon"><Avatar size={'medium'} avatar={value.avatar} icon={hr.icon.Department} /></div>
        <div class="title-wrapper">
          <span class="wrapped-title">{value.name}</span>
        </div>
      {/if}
    </div>
  </svelte:fragment>
  <svelte:fragment slot="utils">
    <Button label={hr.string.AddEmployee} kind={'primary'} on:click={add} />
  </svelte:fragment>

  <Scroller>
    {#each employees as value}
      <StaffPresenter {value} />
    {/each}
  </Scroller>
</Panel>
