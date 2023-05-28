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
  import { Channel, Organization } from '@hcengineering/contact'
  import { createQuery } from '@hcengineering/presentation'
  import Avatar from './Avatar.svelte'
  import { Component, Label } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import contact from '../plugin'
  import ChannelsEditor from './ChannelsEditor.svelte'

  export let organization: Organization
  export let disabled: boolean = false

  let channels: Channel[] = []
  const channelsQuery = createQuery()
  channelsQuery.query(
    contact.class.Channel,
    {
      attachedTo: organization._id
    },
    (res) => {
      channels = res
    }
  )
</script>

<div class="antiContactCard">
  <div class="label uppercase"><Label label={contact.string.Organization} /></div>
  <div class="flex-center logo">
    <Avatar avatar={organization.avatar} size={'large'} icon={contact.icon.Company} />
  </div>
  {#if organization}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <DocNavLink object={organization} {disabled}>
      <div class="name lines-limit-2">
        {organization.name}
      </div>
    </DocNavLink>
    <div class="footer">
      <div class="flex-row-center gap-2">
        <Component
          is={attachment.component.AttachmentsPresenter}
          props={{ value: organization.attachments, object: organization, size: 'small', showCounter: true }}
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
