<!--
// Copyright © 2024 Anticrm Platform Contributors.
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
  import contact, { type Contact, type Employee } from '@hcengineering/contact'
  import { type Ref, type WithLookup } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { AnySvelteComponent, IconSize } from '@hcengineering/ui'

  import { employeeByIdStore, personByIdStore } from '../utils'
  import Avatar from './Avatar.svelte'

  export let _id: Ref<Contact>

  export let name: string | null | undefined = undefined
  export let size: IconSize
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let variant: 'circle' | 'roundedRect' | 'none' = 'roundedRect'
  export let borderColor: number | undefined = undefined
  export let showStatus: boolean = false

  $: empValue = $employeeByIdStore.get(_id as Ref<Employee>) ?? $personByIdStore.get(_id)

  let _contact: WithLookup<Contact> | undefined

  $: if (empValue === undefined) {
    void getClient()
      .findOne(contact.class.Contact, { _id })
      .then((c) => {
        _contact = c
      })
  } else {
    _contact = $employeeByIdStore.get(_id as Ref<Employee>) ?? $personByIdStore.get(_id)
  }
</script>

<Avatar person={_contact} {name} {size} {icon} {variant} {borderColor} {showStatus} />
