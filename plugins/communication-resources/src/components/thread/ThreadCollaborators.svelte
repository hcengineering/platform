<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { AccountUuid, Ref } from '@hcengineering/core'
  import { Card } from '@hcengineering/card'
  import { Avatar, employeeByAccountStore } from '@hcengineering/contact-resources'
  import { createCollaboratorsQuery } from '@hcengineering/presentation'
  import { Collaborator } from '@hcengineering/communication-types'
  import { Person } from '@hcengineering/contact'

  export let threadId: Ref<Card>

  const displayPersonsNumber = 4

  const collaboratorsQuery = createCollaboratorsQuery()

  let collaborators: Collaborator[] = []
  let persons: Person[] = []

  $: collaboratorsQuery.query({ card: threadId }, (res) => {
    collaborators = res
  })

  $: updatePersons(collaborators, $employeeByAccountStore)

  function updatePersons (collaborators: Collaborator[], employeeByAccount: Map<AccountUuid, Person>): void {
    const newPersons: Person[] = []
    for (const collaborator of collaborators) {
      const person = employeeByAccount.get(collaborator.account)
      if (person !== undefined) {
        newPersons.push(person)
      }

      if (newPersons.length >= displayPersonsNumber) {
        break
      }
    }

    persons = newPersons
  }
</script>

{#if persons.length > 0}
  <div class="thread__avatars">
    {#each persons as person}
      <Avatar size="x-small" {person} name={person.name} />
    {/each}
  </div>

  {#if collaborators.length > displayPersonsNumber}
    +{collaborators.length - displayPersonsNumber}
  {/if}
{/if}

<style lang="scss">
  .thread__avatars {
    display: flex;
    gap: 0.25rem;
  }
</style>
