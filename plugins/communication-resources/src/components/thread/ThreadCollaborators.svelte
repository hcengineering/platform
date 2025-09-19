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
  import { AccountUuid, PersonUuid } from '@hcengineering/core'
  import { Avatar, employeeByAccountStore } from '@hcengineering/contact-resources'
  import { Person } from '@hcengineering/contact'

  export let persons: Record<PersonUuid, number> = {}

  const displayPersonsNumber = 4

  let _persons: Person[] = []

  $: updatePersons(persons, $employeeByAccountStore)

  function updatePersons (persons: Record<PersonUuid, number>, employeeByAccount: Map<AccountUuid, Person>): void {
    const newPersons: Person[] = []
    for (const [personUuid, count] of Object.entries(persons)) {
      if (count < 1) continue
      const person = employeeByAccount.get(personUuid as AccountUuid)
      if (person !== undefined) {
        newPersons.push(person)
      }

      if (newPersons.length >= displayPersonsNumber) {
        break
      }
    }

    _persons = newPersons
  }

  $: count = Object.entries(persons).filter(([, count]) => count > 0).length
</script>

{#if _persons.length > 0}
  <div class="thread__avatars">
    {#each _persons as person}
      <Avatar size="x-small" {person} name={person.name} />
    {/each}
  </div>

  {#if count > displayPersonsNumber}
    +{count - displayPersonsNumber}
  {/if}
{/if}

<style lang="scss">
  .thread__avatars {
    display: flex;
    gap: 0.25rem;
  }
</style>
