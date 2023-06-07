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
  import contact, { Member } from '@hcengineering/contact'
  import { getClient } from '@hcengineering/presentation'
  import { DocNavLink } from '@hcengineering/view-resources'
  import { ContactPresenter } from '..'

  export let value: Member
  export let disabled: boolean = false
  export let inline: boolean = false
  export let accent: boolean = false

  const contactRef =
    value?.contact !== undefined ? getClient().findOne(contact.class.Contact, { _id: value.contact }) : undefined
</script>

<DocNavLink object={value} {inline} {disabled} {accent} noUnderline={disabled}>
  {#await contactRef then ct}
    {#if ct}
      <ContactPresenter disabled={true} value={ct} {inline} {accent} />
    {/if}
  {/await}
</DocNavLink>
