<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { AccountUuid } from '@hcengineering/core'
  import { employeeByAccountStore, PersonPresenter } from '@hcengineering/contact-resources'
  import contact, { Person } from '@hcengineering/contact'
  import { createQuery } from '@hcengineering/presentation'

  export let collaborator: AccountUuid

  const query = createQuery()

  let person: Person | undefined

  $: if ($employeeByAccountStore.has(collaborator)) {
    person = $employeeByAccountStore.get(collaborator)
  } else {
    query.query(contact.class.Person, { personUuid: collaborator }, (res) => {
      person = res[0]
    })
  }
</script>

{#if person}
  <PersonPresenter value={person} inlineBlock overflowLabel={false} shouldShowAvatar={false} />
{/if}
