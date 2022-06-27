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
  import { Employee } from '@anticrm/contact'
  import { EmployeePresenter } from '@anticrm/contact-resources'
  import contact from '@anticrm/contact-resources/src/plugin'
  import { Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import { Department, DepartmentMember, Staff } from '@anticrm/hr'
  import { createQuery, getClient, MessageBox, UsersPopup } from '@anticrm/presentation'
  import { Button, eventToHTMLElement, IconAdd, Label, Scroller, showPopup } from '@anticrm/ui'
  import hr from '../plugin'

  export let objectId: Ref<Department> | undefined
  let value: Department | undefined
  let employees: WithLookup<Staff>[] = []
  let accounts: DepartmentMember[] = []

  const departmentQuery = createQuery()
  const query = createQuery()
  const accountsQuery = createQuery()
  const client = getClient()

  $: objectId &&
    value === undefined &&
    departmentQuery.query(
      hr.class.Department,
      {
        _id: objectId
      },
      (res) => ([value] = res)
    )

  $: value &&
    accountsQuery.query(
      contact.class.EmployeeAccount,
      {
        _id: { $in: value.members }
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
        ignoreUsers: employees.filter((p) => p.department === objectId).map((p) => p._id)
      },
      eventToHTMLElement(e),
      addMember
    )
  }

  async function addMember (employee: Employee | undefined): Promise<void> {
    if (employee === null || employee === undefined || value === undefined) {
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

<div class="antiSection">
  <div class="antiSection-header">
    <span class="antiSection-header__title">
      <Label label={contact.string.Members} />
    </span>
    <Button id={hr.string.AddEmployee} icon={IconAdd} kind={'transparent'} shape={'circle'} on:click={add} />
  </div>
  {#if employees.length > 0}
    <Scroller>
      <table class="antiTable">
        <thead class="scroller-thead">
          <tr class="scroller-thead__tr">
            <th><Label label={contact.string.Member} /></th>
            <th><Label label={hr.string.Department} /></th>
          </tr>
        </thead>
        <tbody>
          {#each employees as value}
            <tr class="antiTable-body__row">
              <td><EmployeePresenter {value} /></td>
              <td>
                {#if value.$lookup?.department}
                  {value.$lookup.department.name}
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </Scroller>
  {:else}
    <div class="antiSection-empty solid flex-col-center mt-3">
      <span class="text-sm dark-color">
        <Label label={contact.string.NoMembers} />
      </span>
      <span class="text-sm content-accent-color over-underline" on:click={add}>
        <Label label={contact.string.AddMember} />
      </span>
    </div>
  {/if}
</div>
