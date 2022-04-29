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
  import calendar from '@anticrm/calendar'
  import type { Contact, EmployeeAccount, Organization, Person } from '@anticrm/contact'
  import contact from '@anticrm/contact'
  import { OrganizationSelector } from '@anticrm/contact-resources'
  import { Account, Class, Client, Doc, generateId, getCurrentAccount, Ref } from '@anticrm/core'
  import { getResource, OK, Resource, Severity, Status } from '@anticrm/platform'
  import { Card, getClient, UserBox, UserBoxList } from '@anticrm/presentation'
  import type { Candidate, Review } from '@anticrm/recruit'
  import task, { SpaceWithStates } from '@anticrm/task'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { DateRangePresenter, EditBox, Status as StatusControl } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../../plugin'

  export let space: Ref<SpaceWithStates>
  export let candidate: Ref<Person>

  export let preserveCandidate = false

  const currentUser = getCurrentAccount() as EmployeeAccount

  let status: Status = OK

  let title: string = ''
  let description: string = ''
  let startDate: number = Date.now()
  let dueDate: number = Date.now() + 30 * 60 * 1000
  let location: string = ''
  let company: Ref<Organization> | undefined = undefined

  const doc: Review = {
    number: 0,
    attachedTo: candidate,
    attachedToClass: recruit.mixin.Candidate,
    _class: recruit.class.Review,
    space: space,
    _id: generateId(),
    collection: 'reviews',
    modifiedOn: Date.now(),
    modifiedBy: '' as Ref<Account>,
    date: 0,
    dueDate: undefined,
    description,
    company,
    verdict: '',
    title,
    participants: [currentUser.employee]
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  export function canClose (): boolean {
    return (!preserveCandidate ? candidate === undefined : true) && title.length === 0
  }

  let spaceLabel: string = ''

  $: client.findOne(recruit.class.ReviewCategory, { _id: doc.space }).then((res) => {
    if (res !== undefined) {
      spaceLabel = res.name
    }
  })

  async function createReview () {
    const sequence = await client.findOne(task.class.Sequence, { attachedTo: recruit.class.Review })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }

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

    await client.addCollection(recruit.class.Review, doc.space, doc.attachedTo, doc.attachedToClass, 'reviews', {
      number: (incResult as any).object.sequence,
      date: startDate ?? 0,
      dueDate: dueDate ?? 0,
      description,
      verdict: '',
      title,
      participants: doc.participants,
      company,
      location
    })
  }

  async function invokeValidate (
    action: Resource<<T extends Doc>(doc: T, client: Client) => Promise<Status>>
  ): Promise<Status> {
    const impl = await getResource(action)
    return await impl(doc, client)
  }

  async function validate (doc: Review, _class: Ref<Class<Doc>>): Promise<void> {
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
  const updateStart = (result: any): void => {
    if (result.detail !== undefined) {
      dueDate = result.detail
      dueDate = dueDate
    }
  }
</script>

<Card
  label={recruit.string.CreateReviewParams}
  labelProps={{ label: spaceLabel }}
  okAction={createReview}
  canSave={status.severity === Severity.OK && title.trim().length > 0}
  spaceClass={recruit.class.ReviewCategory}
  spaceQuery={{ archived: false }}
  spaceLabel={recruit.string.ReviewCategory}
  spacePlaceholder={recruit.string.SelectReviewCategory}
  bind:space={doc.space}
  on:close={() => {
    dispatch('close')
  }}
>
  <StatusControl slot="error" {status} />
  <EditBox placeholder={recruit.string.Title} bind:value={title} maxWidth={'37.5rem'} kind={'large-style'} focus />
  <EditBox placeholder={recruit.string.Location} bind:value={location} maxWidth={'37.5rem'} kind={'small-style'} />
  <StyledTextBox
    emphasized
    showButtons={false}
    bind:content={description}
    label={recruit.string.Description}
    alwaysEdit
    placeholder={recruit.string.AddDescription}
  />
  <svelte:fragment slot="pool">
    {#if !preserveCandidate}
      <UserBox
        _class={contact.class.Person}
        bind:value={doc.attachedTo}
        label={recruit.string.Candidate}
        placeholder={recruit.string.Candidates}
        kind={'no-border'}
        size={'small'}
      />
    {/if}
    <OrganizationSelector bind:value={company} label={recruit.string.Company} kind={'no-border'} size={'small'} />
    <DateRangePresenter
      bind:value={startDate}
      labelNull={recruit.string.StartDate}
      withTime
      editable
      on:change={updateStart}
    />
    <DateRangePresenter bind:value={dueDate} labelNull={recruit.string.DueDate} withTime editable />
    <UserBoxList
      _class={contact.class.Employee}
      items={doc.participants}
      label={calendar.string.Participants}
      on:update={(evt) => {
        doc.participants = evt.detail
      }}
    />
  </svelte:fragment>
</Card>
