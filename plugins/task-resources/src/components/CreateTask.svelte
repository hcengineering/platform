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
  import type { Ref, Space } from '@anticrm/core'
  import { DatePicker, EditBox, Dialog, Tabs, Section, Grid, Row, TextArea, IconComments } from '@anticrm/ui'
  import { UserBox, CommentViewer } from '@anticrm/presentation'
  import { ReferenceInput } from '@anticrm/text-editor'
  import type { Person } from '@anticrm/contact'
  import File from './icons/File.svelte'
  
  import { getClient } from '@anticrm/presentation'

  import contact from '@anticrm/contact'
  import task from '../plugin'

  export let space: Ref<Space>

  const dispatch = createEventDispatcher()

  let title: string
  let assignee: Ref<Person>

  const client = getClient()

  function createCandidate() {
    client.createDoc(task.class.Task, space, {
      title,
      assignee,
    })
  }
</script>

<Dialog label={'Create Task'} 
        okLabel={'Create Task'} 
        okAction={createCandidate}
        on:close={() => { dispatch('close') }}>
  <Tabs/>
  <Section icon={File} label={'General Information'}>
    <Grid>
      <Row><EditBox label={'Title *'} placeholder={'The Secret Project'} bind:value={title} focus /></Row>
      <UserBox _class={contact.class.Person} title='Assignee' caption='Employees' bind:value={assignee} />
      <DatePicker title={'Pick due date'} />
      <Row><ReferenceInput /></Row>
    </Grid>
  </Section>
  <Section icon={IconComments} label={'Comments'}>
    <CommentViewer />
    <div class="reference"><ReferenceInput /></div>
  </Section>
</Dialog>

<style lang="scss">
  .reference {
    margin-top: 24px;
  }
</style>
