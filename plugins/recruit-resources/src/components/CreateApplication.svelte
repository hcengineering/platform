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
  import type { Contact, Employee, Person } from '@anticrm/contact'
  import contact from '@anticrm/contact'
  import { Account, Class, Client, Doc, generateId, Ref, SortingOrder } from '@anticrm/core'
  import { getResource, OK, Resource, Severity, Status } from '@anticrm/platform'
  import { Card, getClient, UserBox } from '@anticrm/presentation'
  import type { Applicant, Candidate } from '@anticrm/recruit'
  import task, { calcRank, SpaceWithStates, State } from '@anticrm/task'
  import { Grid, Status as StatusControl } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'

  export let space: Ref<SpaceWithStates>
  export let candidate: Ref<Candidate>
  export let assignee: Ref<Employee>

  export let preserveCandidate = false

  let status: Status = OK

  const doc: Applicant = {
    state: '' as Ref<State>,
    doneState: null,
    number: 0,
    assignee: assignee,
    rank: '',
    attachedTo: candidate,
    attachedToClass: recruit.mixin.Candidate,
    _class: recruit.class.Applicant,
    space: space,
    _id: generateId(),
    collection: 'applications',
    modifiedOn: Date.now(),
    modifiedBy: '' as Ref<Account>
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  export function canClose (): boolean {
    return candidate === undefined && assignee === undefined
  }

  async function createApplication () {
    const state = await client.findOne(task.class.State, { space: doc.space })
    if (state === undefined) {
      throw new Error(`create application: state not found space:${doc.space}`)
    }
    const sequence = await client.findOne(task.class.Sequence, { attachedTo: recruit.class.Applicant })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

    const lastOne = await client.findOne(
      recruit.class.Applicant,
      { state: state._id },
      { sort: { rank: SortingOrder.Descending } }
    )
    const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)

    const candidateInstance = await client.findOne(contact.class.Person, { _id: doc.attachedTo as Ref<Person> })
    if (candidateInstance === undefined) {
      throw new Error('contact not found')
    }
    if (!client.getHierarchy().hasMixin(candidateInstance, recruit.mixin.Candidate)) {
      await client.createMixin<Contact, Candidate>(candidateInstance._id, candidateInstance._class, candidateInstance.space, recruit.mixin.Candidate, {})
    }

    await client.addCollection(
      recruit.class.Applicant,
      doc.space, candidateInstance._id, recruit.mixin.Candidate, 'applications',
      {
        state: state._id,
        doneState: null,
        number: (incResult as any).object.sequence,
        assignee: doc.assignee,
        rank: calcRank(lastOne, undefined)
      }
    )
  }

  async function invokeValidate (
    action: Resource<<T extends Doc>(doc: T, client: Client) => Promise<Status>>
  ): Promise<Status> {
    const impl = await getResource(action)
    return await impl(doc, client)
  }

  async function validate (doc: Applicant, _class: Ref<Class<Doc>>): Promise<void> {
    const clazz = hierarchy.getClass(_class)
    const validatorMixin = hierarchy.as(clazz, view.mixin.ObjectValidator)
    if (validatorMixin?.validator != null) {
      status = await invokeValidate(validatorMixin.validator)
    } else if (clazz.extends != null) {
      await validate(doc, clazz.extends)
    } else {
      status = OK
    }
  }

  $: validate(doc, doc._class)
</script>

<Card
  label={recruit.string.CreateApplication}
  okAction={createApplication}
  canSave={status.severity === Severity.OK}
  spaceClass={recruit.class.Vacancy}
  spaceQuery={{ archived: false }}
  spaceLabel={recruit.string.Vacancy}
  spacePlaceholder={recruit.string.SelectVacancy}
  bind:space={doc.space}
  on:close={() => {
    dispatch('close')
  }}
>
  <StatusControl slot="error" {status} />
  <Grid column={1} rowGap={1}>
    {#if !preserveCandidate}
      <UserBox
        _class={contact.class.Person}
        label={recruit.string.Candidate}
        placeholder={recruit.string.Candidates}
        bind:value={doc.attachedTo}
        kind={'link'}
        size={'x-large'}
        justify={'left'}
        width={'100%'}
        labelDirection={'left'}
      />
    {/if}
    <UserBox
      _class={contact.class.Employee}
      label={recruit.string.AssignRecruiter}
      placeholder={recruit.string.Recruiters}
      bind:value={doc.assignee}
      allowDeselect
      titleDeselect={recruit.string.UnAssignRecruiter}
      kind={'link'}
      size={'x-large'}
      justify={'left'}
      width={'100%'}
      labelDirection={'left'}
    />
  </Grid>
</Card>
