<script lang="ts">
  import { Person, getName } from '@hcengineering/contact'
  import { personByPersonIdStore } from '@hcengineering/contact-resources'
  import { PersonId } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'

  export let reactionAccounts: PersonId[]

  const client = getClient()
  function getPersonName (user: PersonId, personByPersonIdStore: Map<PersonId, Person>): string {
    const person = personByPersonIdStore.get(user)
    return person !== undefined ? getName(client.getHierarchy(), person) : ''
  }
</script>

{#each reactionAccounts as user}
  <div>
    {getPersonName(user, $personByPersonIdStore)}
  </div>
{/each}
