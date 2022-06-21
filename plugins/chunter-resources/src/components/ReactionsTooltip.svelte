<script lang="ts">
  import { Account, Ref } from '@anticrm/core'
  import contact, { EmployeeAccount, formatName } from '@anticrm/contact'
  import { getClient } from '@anticrm/presentation'

  export let reactionAccounts: Ref<Account>[]

  const client = getClient()
  let accountNames: string[] = []

  async function getAccountNames (reactionAccounts: Ref<EmployeeAccount>[]) {
    client
      .findAll(contact.class.EmployeeAccount, { _id: { $in: reactionAccounts } })
      .then((res) => (accountNames = res.map((a) => a.name)))
  }

  $: getAccountNames(reactionAccounts as Ref<EmployeeAccount>[])
</script>

{#each accountNames as name}
  <div>
    {formatName(name)}
  </div>
{/each}
