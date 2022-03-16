<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import contact,{ Organization } from '@anticrm/contact'
  import { Ref } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { Dropdown } from '@anticrm/ui'
  import { ListItem } from '@anticrm/ui/src/types'
  import recruit from '../plugin'
  import Company from './icons/Company.svelte'

  export let value: Ref<Organization> | undefined

  const query = createQuery()

  query.query(contact.class.Organization, {}, (res) => {
    items = res.map((org) => {
      return {
        _id: org._id,
        label: org.name,
        image: org.avatar
      }
    })
    if (value !== undefined) {
      selected = items.find((p) => p._id === value)
    }
  })

  let items: ListItem[] = []
  let selected: ListItem | undefined

  $: setValue(selected)

  function setValue (selected: ListItem | undefined): void {
    if (selected === undefined) {
      value = undefined
    } else {
      value = selected._id as Ref<Organization>
    }
  }
</script>

<Dropdown icon={Company} label={recruit.string.Company} placeholder={recruit.string.Company} {items} bind:selected />