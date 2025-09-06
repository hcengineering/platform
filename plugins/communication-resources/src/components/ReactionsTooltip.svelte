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
  import { notEmpty, PersonId, Ref } from '@hcengineering/core'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import contact, { Person } from '@hcengineering/contact'
  import { getPersonRefsByPersonIdsCb } from '@hcengineering/contact-resources'

  export let socialIds: PersonId[] = []

  let persons: Set<Ref<Person>>
  $: getPersonRefsByPersonIdsCb(socialIds, (personsMap) => {
    persons = new Set(personsMap.values().filter(notEmpty))
  })
</script>

<div class="m-2 flex-col flex-gap-2">
  {#each persons as person (person)}
    <ObjectPresenter objectId={person} _class={contact.class.Person} disabled />
  {/each}
</div>
