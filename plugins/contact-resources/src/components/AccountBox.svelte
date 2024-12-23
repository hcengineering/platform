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
  import { Person, PersonAccount } from '@hcengineering/contact'
  import core, { Account, DocumentQuery, Ref, matchQuery } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { ButtonKind, ButtonSize, IconSize } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import contact from '../plugin'
  import { personAccountByIdStore } from '../utils'
  import UserBox from './UserBox.svelte'

  export let label: IntlString = contact.string.Employee
  export let value: Ref<Account> | null | undefined
  export let docQuery: DocumentQuery<Account> = {}
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let avatarSize: IconSize = 'card'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let readonly = false

  $: accounts = matchQuery<Account>(
    Array.from($personAccountByIdStore.values()),
    docQuery,
    core.class.Account,
    hierarchy
  ) as PersonAccount[]

  let map = new Map<Ref<Person>, Ref<Account>>()
  $: map = new Map(accounts.map((p) => [p.person, p._id]))

  $: employees = accounts.map((p) => p.person)
  $: selectedEmp = value && accounts.find((p) => p._id === value)?.person

  const dispatch = createEventDispatcher()

  function change (e: CustomEvent<Ref<Person> | null>) {
    if (e.detail === null) {
      dispatch('change', null)
    } else {
      const account = map.get(e.detail)
      dispatch('change', account)
    }
  }
</script>

<UserBox
  _class={contact.mixin.Employee}
  docQuery={{ _id: { $in: employees } }}
  showNavigate={false}
  {kind}
  {size}
  {avatarSize}
  {justify}
  {width}
  {label}
  {readonly}
  value={selectedEmp}
  on:change={change}
/>
