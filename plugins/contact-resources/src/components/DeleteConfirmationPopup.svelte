<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Card, createQuery } from '@hcengineering/presentation'
  import { AccountRole, Doc, getCurrentAccount, Ref, SortingOrder } from '@hcengineering/core'
  import view from '@hcengineering/view-resources/src/plugin'
  import { createEventDispatcher } from 'svelte'
  import contact, { Employee, EmployeeAccount } from '@hcengineering/contact'
  import EmployeePresenter from './EmployeePresenter.svelte'
  import { employeeAccountByIdStore } from '../utils'
  import ui, { Label } from '@hcengineering/ui'

  export let object: Doc | Doc[]
  export let deleteAction: () => void
  const objectArray = Array.isArray(object) ? object : [object]
  let owners: Ref<Employee>[] = []
  const query = createQuery()
  query.query(
    contact.class.EmployeeAccount,
    { role: AccountRole.Owner },
    (res) => {
      owners = res.map((account) => account.employee)
    },
    {
      sort: { name: SortingOrder.Descending }
    }
  )
  const dispatch = createEventDispatcher()
  const creators = [
    ...new Set(objectArray.map((obj) => $employeeAccountByIdStore.get(obj.createdBy as Ref<EmployeeAccount>)?.employee))
  ]
  const me = $employeeAccountByIdStore.get(getCurrentAccount()._id as Ref<EmployeeAccount>)?.employee
  const canDelete = (creators.length === 1 && creators.includes(me)) || (me && owners.includes(me))
  const label = canDelete ? view.string.DeleteObject : view.string.DeletePopupNoPermissionTitle
</script>

<Card {label} okAction={deleteAction} canSave={canDelete} okLabel={ui.string.Ok} on:close={() => dispatch('close')}>
  <div class="flex-grow flex-col">
    {#if canDelete}
      <div class="mb-2">
        <Label label={view.string.DeleteObjectConfirm} params={{ count: objectArray.length }} />
      </div>
    {:else}
      <div class="mb-2">
        <Label label={view.string.DeletePopupNoPermissionLabel} />
      </div>
      <div class="mb-2">
        <Label label={view.string.DeletePopupCreatorLabel} />
        {#each creators as employee}
          <div class="my-2">
            <EmployeePresenter value={employee} />
          </div>
        {/each}
      </div>
      <div class="mb-2">
        <Label label={view.string.DeletePopupOwnerLabel} />
        {#each owners as employee}
          <div class="my-2">
            <EmployeePresenter value={employee} />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</Card>
