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
  import calendar from '@hcengineering/calendar'
  import type { Contact, PersonAccount, Organization, Person } from '@hcengineering/contact'
  import contact from '@hcengineering/contact'
  import { Account, Class, Client, DateRangeMode, Doc, generateId, getCurrentAccount, Ref } from '@hcengineering/core'
  import { getResource, OK, Resource, Severity, Status } from '@hcengineering/platform'
  import { Card, getClient } from '@hcengineering/presentation'
  import { UserBox, UserBoxList } from '@hcengineering/contact-resources'
  import type { Applicant, Candidate, Review } from '@hcengineering/recruit'
  import task from '@hcengineering/task'
  import { StyledTextArea } from '@hcengineering/text-editor'
  import { DateRangePresenter, EditBox, Status as StatusControl } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { ObjectSearchBox } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../../plugin'
  import IconCompany from '../icons/Company.svelte'

  // export let space: Ref<SpaceWithStates>
  export let candidate: Ref<Person>
  export let date: Date | undefined = undefined
  export let preserveCandidate = false
  export let withTime = false

  const now = new Date()
  const initDate =
    date === undefined ? now : withTime ? date : new Date(date.setHours(now.getHours(), now.getMinutes()))

  const currentUser = getCurrentAccount() as PersonAccount

  let status: Status = OK

  let title: string = ''
  let description: string = ''
  let startDate: number = initDate.getTime()
  let dueDate: number = initDate.getTime() + 30 * 60 * 1000
  let location: string = ''

  export let company: Ref<Organization> | undefined = undefined
  export let application: Ref<Applicant> | undefined = undefined

  const doc: Review = {
    number: 0,
    attachedTo: candidate,
    attachedToClass: recruit.mixin.Candidate,
    _class: recruit.class.Review,
    space: recruit.space.Reviews,
    _id: generateId(),
    collection: 'reviews',
    modifiedOn: Date.now(),
    modifiedBy: '' as Ref<Account>,
    date: 0,
    access: 'reader',
    allDay: false,
    description,
    application,
    company,
    verdict: '',
    title,
    participants: [currentUser.person],
    eventId: '',
    dueDate: 0
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  export function canClose (): boolean {
    return (preserveCandidate || candidate === undefined) && title.length === 0
  }

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
      application,
      location,
      access: 'reader',
      allDay: false,
      eventId: ''
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
  labelProps={{ label: '' }}
  okAction={createReview}
  canSave={status.severity === Severity.OK && title.trim().length > 0 && doc.attachedTo !== undefined}
  gap={'gapV-4'}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <StatusControl slot="error" {status} />
  <EditBox placeholder={recruit.string.Title} bind:value={title} kind={'large-style'} autoFocus />
  <EditBox placeholder={recruit.string.Location} bind:value={location} kind={'small-style'} />
  <StyledTextArea bind:content={description} placeholder={recruit.string.AddDescription} kind={'emphasized'} />
  <svelte:fragment slot="pool">
    {#if !preserveCandidate}
      <UserBox
        _class={contact.class.Person}
        bind:value={doc.attachedTo}
        label={recruit.string.Talent}
        placeholder={recruit.string.Talents}
        kind={'regular'}
        size={'large'}
        create={{ component: recruit.component.CreateCandidate, label: recruit.string.CreateTalent }}
      />
    {/if}
    <UserBox
      _class={contact.class.Organization}
      bind:value={company}
      label={recruit.string.Company}
      icon={IconCompany}
      kind={'regular'}
      size={'large'}
      showNavigate={false}
      create={{ component: contact.component.CreateOrganization, label: contact.string.CreateOrganization }}
    />
    <ObjectSearchBox
      _class={recruit.class.Applicant}
      bind:value={application}
      label={recruit.string.Application}
      placeholder={recruit.string.ApplicationCreateLabel}
      kind={'regular'}
      size={'large'}
      searchField={'number'}
      showNavigate={false}
      allowCategory={[recruit.completion.ApplicationCategory]}
    />
    <DateRangePresenter
      bind:value={startDate}
      labelNull={recruit.string.StartDate}
      mode={DateRangeMode.DATETIME}
      editable
      kind={'regular'}
      size={'large'}
      on:change={updateStart}
    />
    <DateRangePresenter
      bind:value={dueDate}
      labelNull={recruit.string.DueDate}
      mode={DateRangeMode.DATETIME}
      editable
      kind={'regular'}
      size={'large'}
    />
    <UserBoxList bind:items={doc.participants} label={calendar.string.Participants} kind={'regular'} size={'large'} />
  </svelte:fragment>
</Card>
