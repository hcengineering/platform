<script lang="ts">
  import { notEmpty, PersonId, Ref } from '@hcengineering/core'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import contact, { Person } from '@hcengineering/contact'
  import { getPersonRefByPersonId } from '@hcengineering/contact-resources'

  export let socialIds: PersonId[] = []

  $: void fillPersons(socialIds)

  let persons: Set<Ref<Person>>
  async function fillPersons (ids: PersonId[]): Promise<void> {
    persons = new Set((await Promise.all(ids.map((user) => getPersonRefByPersonId(user)))).filter(notEmpty))
  }
</script>

<div class="m-2 flex-col flex-gap-2">
  {#each persons as person}
    <ObjectPresenter objectId={person} _class={contact.class.Person} disabled />
  {/each}
</div>
