<script lang="ts">
  import contact, { Employee, EmployeeAccount, getName } from '@hcengineering/contact'
  import { Account, IdMap, Ref, toIdMap } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'

  export let reactionAccounts: Ref<Account>[]
  let accounts: IdMap<EmployeeAccount> = new Map()
  let employees: IdMap<Employee> = new Map()

  const query = createQuery()
  const empQ = createQuery()
  $: query.query(contact.class.EmployeeAccount, {}, (res) => {
    accounts = toIdMap(res)
  })

  empQ.query(contact.class.Employee, {}, (res) => (employees = toIdMap(res)))

  function getAccName (acc: Ref<Account>, accounts: IdMap<EmployeeAccount>, employees: IdMap<Employee>): string {
    const account = accounts.get(acc as Ref<EmployeeAccount>)
    if (account !== undefined) {
      const emp = employees.get(account.employee)
      return emp ? getName(emp) : ''
    }
    return ''
  }
</script>

{#each reactionAccounts as acc}
  <div>
    {getAccName(acc, accounts, employees)}
  </div>
{/each}
