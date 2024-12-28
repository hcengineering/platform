<!--
// Copyright © 2023 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { PersonId, Ref } from '@hcengineering/core'
  import { Component } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import contact, { getPersonRefsBySocialIds, Person } from '@hcengineering/contact'

  export let value: [any, PersonId][]

  const client = getClient()
  let persons: Ref<Person>[] = []
  $: void getPersons(value.map((p) => p[1]).flat())

  async function getPersons (ids: PersonId[]): Promise<void> {
    if (ids !== undefined) {
      const personsMap = await getPersonRefsBySocialIds(client, ids)
      persons = Object.values(personsMap)
      console.log(persons)
    }
  }
</script>

<Component
  is={contact.component.PersonFilterValuePresenter}
  props={{ value: persons }}
/>
