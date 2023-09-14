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
  import contact, { Channel, Contact, getName } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { CircleButton, tooltip } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import { channelProviders } from '../../utils'

  export let value: Channel
  export let disabled: boolean = false
  $: provider = $channelProviders.find((it) => it._id === value.provider)

  let target: Contact | undefined
  const query = createQuery()
  $: query.query(contact.class.Contact, { _id: value.attachedTo as Ref<Contact> }, (res) => ([target] = res))

  const client = getClient()
</script>

<div class="flex-row-center" use:tooltip={{ label: getEmbeddedLabel(value.value) }}>
  {#if provider}
    <CircleButton icon={provider.icon} size={'small'} />
  {/if}
  {#if target}
    <div class="ml-1">
      <DocNavLink object={target} {disabled}>
        {getName(client.getHierarchy(), target)}
      </DocNavLink>
    </div>
  {/if}
</div>
