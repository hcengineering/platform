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
  import contact, { Member } from '@anticrm/contact'
  import { Hierarchy } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { getPanelURI } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { ContactPresenter } from '..'

  export let value: Member

  const contactRef = getClient().findOne(contact.class.Contact, { _id: value.contact })
</script>

<a href={`#${getPanelURI(view.component.EditDoc, value._id, Hierarchy.mixinOrClass(value), 'content')}`}>
  {#await contactRef then ct}
    {#if ct}
      <ContactPresenter isInteractive={false} value={ct} />
    {/if}
  {/await}
</a>
