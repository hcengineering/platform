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
  import contact, { Employee, PersonAccount } from '@hcengineering/contact'
  import core, { Account, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import { personAccountByIdStore } from '../utils'
  import UserBoxList from './UserBoxList.svelte'

  export let label: IntlString
  export let value: Ref<Account>[]
  export let onChange: ((refs: Ref<Account>[]) => void) | undefined
  export let readonly = false
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let width: string | undefined = undefined
  export let includeItems: Ref<Account>[] | undefined = undefined
  export let excludeItems: Ref<Account>[] | undefined = undefined
  export let emptyLabel: IntlString | undefined = undefined

  let timer: any = null
  const client = getClient()
  let update: (() => Promise<void>) | undefined

  function onUpdate (evt: CustomEvent<Ref<Employee>[]>): void {
    if (timer !== null) {
      clearTimeout(timer)
    }
    update = async () => {
      const accounts = await client.findAll(contact.class.PersonAccount, { person: { $in: evt.detail } })
      onChange?.(accounts.map((it) => it._id))
      if (timer !== null) {
        clearTimeout(timer)
      }
      timer = null
      update = undefined
    }
    timer = setTimeout(() => update?.(), 500)
  }

  onDestroy(() => {
    void update?.()
  })

  const excludedQuery = createQuery()
  let excluded: Account[] = []
  $: if (excludeItems !== undefined && excludeItems.length > 0) {
    excludedQuery.query(core.class.Account, { _id: { $in: excludeItems } }, (res) => {
      excluded = res
    })
  } else {
    excludedQuery.unsubscribe()
    excluded = []
  }

  const includedQuery = createQuery()
  let included: Account[] = []
  $: if (includeItems !== undefined && includeItems.length > 0) {
    includedQuery.query(core.class.Account, { _id: { $in: includeItems } }, (res) => {
      included = res
    })
  } else {
    includedQuery.unsubscribe()
    included = []
  }

  $: employees = Array.from(
    (value ?? []).map((it) => $personAccountByIdStore.get(it as Ref<PersonAccount>)?.person)
  ).filter((it) => it !== undefined) as Ref<Employee>[]

  $: docQuery =
    excluded.length === 0 && included.length === 0
      ? {}
      : {
          _id: {
            ...(included.length > 0
              ? {
                  $in: included.map((p) => (p as PersonAccount).person as Ref<Employee>)
                }
              : {}),
            ...(excluded.length > 0
              ? {
                  $nin: excluded.map((p) => (p as PersonAccount).person as Ref<Employee>)
                }
              : {})
          }
        }
</script>

<UserBoxList
  items={employees}
  {label}
  {emptyLabel}
  {readonly}
  {docQuery}
  on:update={onUpdate}
  {size}
  justify={'left'}
  width={width ?? 'min-content'}
  {kind}
/>
