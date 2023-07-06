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
  import { Organization, Person } from '@hcengineering/contact'
  import { Class, Ref, Space } from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import { createFocusManager, FocusHandler } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import contact from '../plugin'
  import UserBox from './UserBox.svelte'

  export let organization: Ref<Organization>
  export let _class: Ref<Class<Organization>>
  export let space: Ref<Space>
  const dispatch = createEventDispatcher()

  let person: Ref<Person> | undefined

  export function canClose (): boolean {
    return person === undefined
  }

  const client = getClient()

  async function createMember () {
    if (person === undefined) {
      return
    }
    const id = await client.addCollection(contact.class.Member, space, organization, _class, 'members', {
      contact: person
    })

    dispatch('close', id)
  }
  const manager = createFocusManager()
</script>

<FocusHandler {manager} />
<Card
  label={contact.string.AddMember}
  okAction={createMember}
  canSave={!!person}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="flex-row-center clear-mins">
    <!-- <div class="mr-3">
      <Button focusIndex={1} icon={Vacancy} size={'medium'} kind={'link-bordered'} />
    </div>    -->
  </div>
  <svelte:fragment slot="pool">
    <UserBox
      focusIndex={3}
      _class={contact.class.Person}
      label={contact.string.Member}
      placeholder={contact.string.Member}
      bind:value={person}
      kind={'no-border'}
      size={'small'}
      icon={contact.icon.Person}
      create={{ component: contact.component.CreatePerson, label: contact.string.CreatePerson }}
    />
  </svelte:fragment>
</Card>
