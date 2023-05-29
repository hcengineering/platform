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
  import contact, { Contact, Member, Organization } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Scroller } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import ExpandRightDouble from './icons/ExpandRightDouble.svelte'
  import OrganizationCard from './OrganizationCard.svelte'
  import PersonCard from './PersonCard.svelte'

  export let object: Member

  let refContact: Contact
  const personQuery = createQuery()
  $: if (object !== undefined) {
    personQuery.query(contact.class.Contact, { _id: object.contact }, (result) => {
      refContact = result[0]
    })
  } else {
    personQuery.unsubscribe()
  }

  let organization: Organization
  const orgQuery = createQuery()
  $: if (object !== undefined) {
    orgQuery.query(contact.class.Organization, { _id: object.attachedTo as Ref<Organization> }, (result) => {
      organization = result[0]
    })
  } else {
    orgQuery.unsubscribe()
  }

  const dispatch = createEventDispatcher()

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'number'] })
  })
</script>

{#if object !== undefined && refContact !== undefined && organization !== undefined}
  <Scroller horizontal>
    <div class="flex-between min-w-min">
      <div class="card"><PersonCard object={refContact} on:click /></div>
      <div class="arrows"><ExpandRightDouble /></div>
      <div class="card"><OrganizationCard {organization} /></div>
    </div>
  </Scroller>
{/if}

<style lang="scss">
  .card {
    align-self: stretch;
    width: calc(50% - 3rem);
    min-height: 16rem;
  }
  .arrows {
    width: 4rem;
  }
</style>
