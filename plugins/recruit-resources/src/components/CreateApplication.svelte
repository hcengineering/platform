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
  import { DatePicker, EditBox, Card, Tabs, Section, Grid, Row, Button } from '@anticrm/ui'
  import { UserBox, UserInfo, Avatar } from '@anticrm/presentation'
  import type { Person } from '@anticrm/contact'
  import File from './icons/File.svelte'
  import Address from './icons/Address.svelte'
  import Attachment from './icons/Attachment.svelte'

  import { getClient } from '@anticrm/presentation'

  import core from '@anticrm/core'
  import recruit from '../plugin'

  export let space: Ref<Space>

  const dispatch = createEventDispatcher()

  let candidate: Ref<Person>

  const client = getClient()

  async function createCandidate() {
    const state = client.findOne(core.class.State, { space })
    await client.createDoc(recruit.class.Applicant, space, {
      candidate,
      state
    })
    dispatch('close')
  }

</script>

<Card label={'Create Application'} 
      okLabel={'Save'} 
      okAction={createCandidate}
      on:close={() => { dispatch('close') }}>
  <Grid column={1} rowGap={1.75}>
    <UserBox _class={recruit.class.Candidate} title='Candidate' caption='Candidates' bind:value={candidate} />
    <UserBox _class={recruit.class.Candidate} title='Assigned recruiter' caption='Recruiters' bind:value={candidate} />
  </Grid>
</Card>
