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
  import type { Ref, Space, SpaceWithStates } from '@anticrm/core'
  import { Status, OK, Severity } from '@anticrm/platform'
  import { DatePicker, EditBox, Tabs, Section, Grid, Status as StatusControl } from '@anticrm/ui'
  import { UserBox, Card, UserInfo, Avatar } from '@anticrm/presentation'
  import type { Employee, Person } from '@anticrm/contact'
  import type { Candidate } from '@anticrm/recruit'
  import Address from './icons/Address.svelte'
  import Attachment from './icons/Attachment.svelte'

  import { getClient } from '@anticrm/presentation'

  import core from '@anticrm/core'
  import recruit from '../plugin'
  import contact from '@anticrm/contact'
  import view from '@anticrm/view'

  export let space: Ref<SpaceWithStates>
  export let candidate: Ref<Candidate> // | null = null
  export let employee: Ref<Employee> // | null = null

  export let preserveCandidate = false

  let status: Status = OK
  let _space = space

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function createApplication() {
    const state = await client.findOne(core.class.State, { space: _space })
    if (state === undefined) {
      throw new Error('create application: state not found')
    }
    const id = await client.createDoc(recruit.class.Applicant, _space, {
      candidate,
      state: state._id
    })

    const kanban = await client.findOne(view.class.Kanban, { attachedTo: _space })

    if (kanban === undefined) {
      throw new Error('kanban object not found')
    }

    await client.updateDoc(view.class.Kanban, _space, kanban._id, {
      $push: {
        order: id
      }
    })    
    dispatch('close')
  }

  async function validate(candidate: Ref<Candidate>, space: Ref<Space>) {
    if (candidate === undefined) {
      status = new Status(Severity.INFO, recruit.status.CandidateRequired, {})
    } else {
      if (space === undefined) {
        status = new Status(Severity.INFO, recruit.status.VacancyRequired, {})
      } else {
        const applicants = await client.findAll(recruit.class.Applicant, { space, candidate})
        if (applicants.length > 0) {
          status = new Status(Severity.ERROR,  recruit.status.ApplicationExists, {})
        } else {
          status = OK
        }
      }
    }
  }

  $: validate(candidate, _space)

</script>

<Card label={'Create Application'} 
      okLabel={'Save'}
      okAction={createApplication}
      canSave={status.severity === Severity.OK}
      spaceClass={recruit.class.Vacancy}
      spaceLabel={'Vacancy'}
      spacePlaceholder={'Select vacancy'}
      bind:space={_space}
      on:close={() => { dispatch('close') }}>
  <svelte:fragment slot="error">
    {#if status !== OK}
      <StatusControl {status} />
    {/if}
  </svelte:fragment>
  <Grid column={1} rowGap={1.75}>
    {#if !preserveCandidate}
      <UserBox _class={recruit.class.Candidate} title='Candidate' caption='Candidates' bind:value={candidate} />
    {/if}
    <UserBox _class={contact.class.Employee} title='Assigned recruiter' caption='Recruiters' bind:value={employee} />
  </Grid>
</Card>
