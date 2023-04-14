<script lang="ts">
  import { Employee, EmployeeAccount, getName } from '@hcengineering/contact'
  import { employeeAccountByIdStore, employeeByIdStore } from '@hcengineering/contact-resources'
  import { Account, IdMap, Ref } from '@hcengineering/core'

  export let reactionAccounts: Ref<Account>[]

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
    {getAccName(acc, $employeeAccountByIdStore, $employeeByIdStore)}
  </div>
{/each}
