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
  import { createEventDispatcher } from 'svelte'
  import { IconFolder, EditBox, ToggleWithLabel, Grid } from '@hcengineering/ui'

  import { getClient, SpaceCreateCard } from '@hcengineering/presentation'

  import contact from '../plugin'
  import core, { getCurrentAccount } from '@hcengineering/core'

  const dispatch = createEventDispatcher()

  let name: string = ''
  const description: string = ''
  export function canClose (): boolean {
    return name === ''
  }
  const client = getClient()

  function createChannel () {
    client.createDoc(contact.class.Organizations, core.space.Space, {
      name,
      description,
      private: false,
      archived: false,
      members: [getCurrentAccount()._id]
    })
  }
</script>

<SpaceCreateCard
  label={contact.string.CreateOrganizations}
  okAction={createChannel}
  canSave={!!name}
  on:close={() => {
    dispatch('close')
  }}
>
  <Grid column={1} rowGap={1.5}>
    <EditBox
      label={contact.string.Name}
      icon={IconFolder}
      bind:value={name}
      placeholder={contact.string.OrganizationsNamePlaceholder}
      focus
    />
    <ToggleWithLabel label={contact.string.MakePrivate} description={contact.string.MakePrivateDescription} />
  </Grid>
</SpaceCreateCard>
