<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import contact, { getName, Person } from '@hcengineering/contact'
  import PersonPresenter from '@hcengineering/contact-resources/src/components/PersonPresenter.svelte'
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import type { Applicant } from '@hcengineering/recruit'

  export let value: Applicant

  const client = getClient()
  const shortLabel = client.getHierarchy().getClass(value._class).shortLabel

  let person: Person | undefined

  $: client.findOne(contact.class.Person, { _id: value.attachedTo as Ref<Person> }).then((p) => {
    person = p
  })
</script>

<div class="flex-row-center">
  <!-- <Icon icon={recruit.icon.Application} size={'medium'} /> -->
  <PersonPresenter value={person} avatarSize={'smaller'} shouldShowName={false} />
  <span class="ml-2">
    {#if shortLabel}{shortLabel}-{/if}{value.number}
  </span>
  {#if person}
    <span class="ml-1">{getName(client.getHierarchy(), person)}</span>
  {/if}
</div>
