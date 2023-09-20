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
  import attachment from '@hcengineering/attachment'
  import contact, { Channel, Contact, getName } from '@hcengineering/contact'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import Avatar from './Avatar.svelte'
  import { Component, Label } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import ChannelsEditor from './ChannelsEditor.svelte'

  export let object: Contact
  export let disabled: boolean = false

  const client = getClient()

  let channels: Channel[] = []
  const channelsQuery = createQuery()
  channelsQuery.query(
    contact.class.Channel,
    {
      attachedTo: object._id
    },
    (res) => {
      channels = res
    }
  )
</script>

<div class="antiContactCard">
  <div class="label uppercase"><Label label={contact.string.Person} /></div>
  <div class="flex-center logo">
    <Avatar avatar={object.avatar} size={'large'} icon={contact.icon.Company} name={object.name} />
  </div>
  {#if object}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <DocNavLink {object} {disabled}>
      <div class="name lines-limit-2">
        {getName(client.getHierarchy(), object)}
      </div>
    </DocNavLink>
    <div class="description overflow-label">{object.city ?? ''}</div>
    <div class="footer">
      <div class="flex-row-center gap-2">
        <Component
          is={attachment.component.AttachmentsPresenter}
          props={{ value: object.attachments, object, size: 'small', showCounter: true }}
        />
      </div>
      {#if channels[0]}
        <ChannelsEditor
          attachedTo={channels[0].attachedTo}
          attachedClass={channels[0].attachedToClass}
          length={'short'}
          editable={false}
        />
      {/if}
    </div>
  {/if}
</div>
