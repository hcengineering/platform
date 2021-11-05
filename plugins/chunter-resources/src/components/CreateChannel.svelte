<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { EditBox, ToggleWithLabel, Grid } from '@anticrm/ui'

  import { getClient, SpaceCreateCard } from '@anticrm/presentation'

  import chunter from '../plugin'
  import core from '@anticrm/core'

  const dispatch = createEventDispatcher()

  let name: string = ''
  let description: string = ''
  let locked: boolean = false

  export function canClose(): boolean {
    return name === ''
  }

  const client = getClient()

  function createChannel() {
    client.createDoc(chunter.class.Channel, core.space.Model, {
      name,
      description,
      private: locked,
      members: []
    })
  }
</script>

<SpaceCreateCard
  label={chunter.string.CreateChannel} 
  okAction={createChannel}
  canSave={name ? true : false}
  on:close={() => { dispatch('close') }}
>
  <Grid column={1} rowGap={1.5}>
    <EditBox
      icon={locked ? chunter.icon.Lock : chunter.icon.Hashtag}
      label={chunter.string.ChannelName}
      bind:value={name}
      maxWidth={'15rem'}
      focus
    />
    <ToggleWithLabel label={chunter.string.MakePrivate} description={chunter.string.MakePrivateDescription} bind:on={locked}/>
  </Grid>
</SpaceCreateCard>
