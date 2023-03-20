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
  import { Employee, EmployeeAccount } from '@hcengineering/contact'
  import { Account, DocumentQuery, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import contact from '../plugin'
  import UserBox from './UserBox.svelte'

  export let label: IntlString = contact.string.Employee
  export let value: Ref<Account> | null | undefined
  export let docQuery: DocumentQuery<Account> = {}
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let readonly = false

  const query = createQuery()

  let accounts: EmployeeAccount[] = []

  query.query<EmployeeAccount>(contact.class.EmployeeAccount, docQuery as DocumentQuery<EmployeeAccount>, (res) => {
    accounts = res
    map = new Map(res.map((p) => [p.employee, p._id]))
  })

  let map: Map<Ref<Employee>, Ref<Account>> = new Map()

  $: employees = accounts.map((p) => p.employee)
  $: selectedEmp = value && accounts.find((p) => p._id === value)?.employee

  const dispatch = createEventDispatcher()

  function change (e: CustomEvent<Ref<Employee> | null>) {
    if (e.detail === null) {
      dispatch('change', null)
    } else {
      const account = map.get(e.detail)
      dispatch('change', account)
    }
  }
</script>

<UserBox
  _class={contact.class.Employee}
  docQuery={{ _id: { $in: employees } }}
  showNavigate={false}
  {kind}
  {size}
  {label}
  {readonly}
  value={selectedEmp}
  on:change={change}
/>
