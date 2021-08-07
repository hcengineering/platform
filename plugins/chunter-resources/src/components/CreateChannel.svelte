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
  import { TextArea, EditBox, Dialog, ToggleWithLabel, Grid, Section, IconToDo, CheckBoxList } from '@anticrm/ui'

  import { getClient } from '@anticrm/presentation'

  import chunter from '../plugin'
  import core from '@anticrm/core'

  const dispatch = createEventDispatcher()

  let name: string = ''
  let description: string = ''

  const client = getClient()

  function createChannel() {
    client.createDoc(chunter.class.Channel, core.space.Model, {
      name,
      description,
      private: false
    })
  }
</script>

<Dialog label={chunter.string.CreateChannel} 
        okLabel={chunter.string.CreateChannel} 
        okAction={createChannel}
        on:close={() => { dispatch('close') }}>
  <Grid column={1}>
    <EditBox label={chunter.string.ChannelName} bind:value={name} focus/>
    <TextArea label={chunter.string.ChannelDescription} bind:value={description}/>
    <ToggleWithLabel label={chunter.string.MakePrivate} description={chunter.string.MakePrivateDescription}/>
  </Grid>
  <Section icon={IconToDo} label={`To Do's`}>
    <CheckBoxList label={'Add a To Do'} editable />
  </Section>
</Dialog>


<style lang="scss">

  .content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    row-gap: 20px;
    
    .row {
      grid-column-start: 1;
      grid-column-end: 3;
    }
  }

</style>