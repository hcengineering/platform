<script lang="ts">
  import { Person, PersonAccount, getName } from '@hcengineering/contact'
  import { personAccountByIdStore, personByIdStore } from '@hcengineering/contact-resources'
  import { Account, IdMap, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'

  export let reactionAccounts: Ref<Account>[]

  const client = getClient()
  function getAccName (acc: Ref<Account>, accounts: IdMap<PersonAccount>, employees: IdMap<Person>): string {
    const account = accounts.get(acc as Ref<PersonAccount>)
    if (account !== undefined) {
      const emp = employees.get(account.person)
      return emp ? getName(client.getHierarchy(), emp) : ''
    }
    return ''
  }
</script>

{#each reactionAccounts as acc}
  <div>
    {getAccName(acc, $personAccountByIdStore, $personByIdStore)}
  </div>
{/each}
