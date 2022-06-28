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
  import { CircleButton, eventToHTMLElement, IconAdd, Label, Scroller, showPopup } from '@anticrm/ui'
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
        docQuery: {
          active: true
        },
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

<div class="container">
  <div class="flex flex-between">
    <div class="title"><Label label={contact.string.Members} /></div>
    <CircleButton id={hr.string.AddEmployee} icon={IconAdd} size={'small'} selected on:click={add} />
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
    <div class="flex-col-center mt-5 create-container">
      <div class="text-sm content-dark-color mt-2">
        <Label label={contact.string.NoMembers} />
      </div>
      <div class="text-sm">
        <div class="over-underline" on:click={add}><Label label={contact.string.AddMember} /></div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;

    .title {
      margin-right: 0.75rem;
      font-weight: 500;
      font-size: 1.25rem;
      color: var(--theme-caption-color);
    }
  }

  .create-container {
    padding: 1rem;
    color: var(--theme-caption-color);
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 0.75rem;
  }
</style>
