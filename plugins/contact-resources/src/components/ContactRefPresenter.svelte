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
  import { Contact } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import contact from '../plugin'
  import ContactPresenter from './ContactPresenter.svelte'

  export let value: Ref<Contact>
  export let disabled: boolean = false
  export let accent: boolean = false
  export let maxWidth = ''
  export let inline: boolean = false

  let doc: Contact | undefined
  const query = createQuery()
  $: value && query.query(contact.class.Contact, { _id: value }, (res) => ([doc] = res), { limit: 1 })
</script>

{#if doc}
  <ContactPresenter value={doc} {disabled} {maxWidth} {inline} {accent} />
{/if}
