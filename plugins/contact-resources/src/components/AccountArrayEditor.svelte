<script lang="ts">
  import contact, { Employee, EmployeeAccount } from '@hcengineering/contact'
  import core, { Account, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient, UserBoxList } from '@hcengineering/presentation'

  export let label: IntlString
  export let value: Ref<Account>[]
  export let onChange: (refs: Ref<Account>[]) => void
  export let readonly = false

  let timer: any
  const client = getClient()

  function onUpdate (evt: CustomEvent<Ref<Employee>[]>): void {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      const accounts = await client.findAll(contact.class.EmployeeAccount, { employee: { $in: evt.detail } })
      onChange(accounts.map((it) => it._id))
    }, 500)
  }

  const accountQuery = createQuery()

  let accounts: Account[] = []

  $: accountQuery.query(core.class.Account, { _id: { $in: value } }, (res) => {
    accounts = res
  })

  $: employess = accounts.map((it) => (it as EmployeeAccount).employee)
</script>

<UserBoxList
  items={employess}
  {label}
  {readonly}
  on:update={onUpdate}
  kind={'link'}
  size={'medium'}
  justify={'left'}
  width={'100%'}
/>
