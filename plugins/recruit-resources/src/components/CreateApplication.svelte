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
  import { Card, createQuery, getClient, SpaceSelector, UserBox } from '@anticrm/presentation'
  import type { Applicant, Candidate, Vacancy } from '@anticrm/recruit'
  import task, { calcRank, SpaceWithStates, State } from '@anticrm/task'
  import ui, {
    Button,
    ColorPopup,
    createFocusManager,
    eventToHTMLElement,
    FocusHandler,
    getPlatformColor,
    showPopup,
    Status as StatusControl
  } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'

  export let space: Ref<SpaceWithStates>
  export let candidate: Ref<Candidate>
  export let assignee: Ref<Employee>

  export let preserveCandidate = false

  let status: Status = OK
  let createMore: boolean = false

  let doc: Applicant = {
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
    return (preserveCandidate || candidate === undefined) && assignee === undefined
  }

  async function createApplication () {
    const state = await client.findOne(task.class.State, { space: doc.space, _id: doc.state })
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
      await client.createMixin<Contact, Candidate>(
        candidateInstance._id,
        candidateInstance._class,
        candidateInstance.space,
        recruit.mixin.Candidate,
        {}
      )
    }

    await client.addCollection(
      recruit.class.Applicant,
      doc.space,
      candidateInstance._id,
      recruit.mixin.Candidate,
      'applications',
      {
        state: state._id,
        doneState: null,
        number: (incResult as any).object.sequence,
        assignee: doc.assignee,
        rank: calcRank(lastOne, undefined)
      }
    )

    if (createMore) {
      // Prepare for next
      doc = {
        state: selectedState._id,
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
    }
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

  let states: Array<{ id: number | string; color: number; label: string }> = []
  let selectedState: State
  const statesQuery = createQuery()
  $: if (doc.space) {
    statesQuery.query(
      task.class.State,
      { space: doc.space },
      (res) => {
        states = res.map((s) => {
          return { id: s._id, label: s.title, color: s.color }
        })
        selectedState = res.filter((s) => s._id === doc.state)[0] ?? res[0]
        doc.state = selectedState._id
      },
      { sort: { rank: SortingOrder.Ascending } }
    )
  } else {
    states = []
  }
  const manager = createFocusManager()

  const existingApplicationsQuery = createQuery()
  let existingApplicants: Ref<Contact>[] = []
  $: existingApplicationsQuery.query(
    recruit.class.Applicant,
    {
      space: doc.space
    },
    (result) => {
      existingApplicants = result.map((it) => it.attachedTo)
    },
    {
      projection: {
        _id: 1,
        attachedTo: 1
      }
    }
  )
</script>

<FocusHandler {manager} />

<Card
  label={recruit.string.CreateApplication}
  okAction={createApplication}
  canSave={status.severity === Severity.OK}
  bind:createMore={createMore}
  on:close={() => {
    dispatch('close')
  }}
>
  <svelte:fragment slot="header">
    <SpaceSelector
      _class={recruit.class.Vacancy}
      query={{ archived: false }}
      label={recruit.string.Vacancy}
      create={{
        component: recruit.component.CreateVacancy,
        label: recruit.string.CreateVacancy
      }}
      bind:space={doc.space}
    />
  </svelte:fragment>
  <StatusControl slot="error" {status} />
  <svelte:fragment slot="pool">
    {#key doc}
      {#if !preserveCandidate}
        <UserBox
          focusIndex={1}
          _class={contact.class.Person}
          options={{ sort: { modifiedOn: -1 } }}
          excluded={existingApplicants}
          label={recruit.string.Candidate}
          placeholder={recruit.string.Candidates}
          bind:value={doc.attachedTo}
          kind={'no-border'}
          size={'small'}
          create={{ component: recruit.component.CreateCandidate, label: recruit.string.CreateCandidate }}
        />
      {/if}
      <UserBox
        focusIndex={2}
        _class={contact.class.Employee}
        label={recruit.string.AssignRecruiter}
        placeholder={recruit.string.Recruiters}
        bind:value={doc.assignee}
        allowDeselect
        titleDeselect={recruit.string.UnAssignRecruiter}
        kind={'no-border'}
        size={'small'}
      />
      {#if states && doc.space}
        <Button
          focusIndex={3}
          width="min-content"
          size="small"
          kind="no-border"
          on:click={(ev) => {
            showPopup(
              ColorPopup,
              { value: states, searchable: true, placeholder: ui.string.SearchDots },
              eventToHTMLElement(ev),
              (result) => {
                if (result && result.id) {
                  doc.state = result.id
                  selectedState = result
                  selectedState.title = result.label
                }
                manager.setFocusPos(3)
              }
            )
          }}
        >
          <div slot="content" class="flex-row-center">
            {#if selectedState}
              <div class="color" style="background-color: {getPlatformColor(selectedState.color)}" />
              <span class="label overflow-label">{selectedState.title}</span>
            {/if}
          </div>
        </Button>
      {/if}
    {/key}
  </svelte:fragment>
</Card>

<style lang="scss">
  // .card {
  //   align-self: stretch;
  //   width: calc(50% - 3rem);
  //   min-height: 16rem;

  //   &.empty {
  //     display: flex;
  //     justify-content: center;
  //     align-items: center;
  //     font-size: .75rem;
  //     color: var(--dark-color);
  //     border: 1px solid var(--divider-color);
  //     border-radius: .25rem;
  //   }
  // }
  // .arrows { width: 4rem; }
  .color {
    margin-right: 0.375rem;
    width: 0.875rem;
    height: 0.875rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.25rem;
  }
  .label {
    flex-grow: 1;
    min-width: 0;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
</style>
