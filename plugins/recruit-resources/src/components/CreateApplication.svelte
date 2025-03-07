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
  import { AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import chunter from '@hcengineering/chunter'
  import type { Contact, Employee, Person } from '@hcengineering/contact'
  import contact from '@hcengineering/contact'
  import { EmployeeBox, ExpandRightDouble, UserBox } from '@hcengineering/contact-resources'
  import core, {
    AccountRole,
    Class,
    Client,
    Doc,
    FindOptions,
    Markup,
    Ref,
    SortingOrder,
    Space,
    Status as TaskStatus,
    fillDefaults,
    generateId,
    getCurrentAccount,
    hasAccountRole
  } from '@hcengineering/core'
  import { OK, Resource, Severity, Status, getResource } from '@hcengineering/platform'
  import presentation, {
    Card,
    InlineAttributeBar,
    SpaceSelect,
    createQuery,
    getClient
  } from '@hcengineering/presentation'
  import { recruitId, type Applicant, type Candidate, type Vacancy, RecruitEvents } from '@hcengineering/recruit'
  import task, { TaskType, getStates, makeRank } from '@hcengineering/task'
  import { TaskKindSelector, selectedTypeStore, typeStore } from '@hcengineering/task-resources'
  import { EmptyMarkup, isEmptyMarkup } from '@hcengineering/text'
  import ui, {
    Button,
    ColorPopup,
    FocusHandler,
    Label,
    Status as StatusControl,
    createFocusManager,
    deviceOptionsStore as deviceInfo,
    getColorNumberByText,
    getPlatformColorDef,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { statusStore } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'
  import CandidateCard from './CandidateCard.svelte'
  import VacancyCard from './VacancyCard.svelte'
  import VacancyOrgPresenter from './VacancyOrgPresenter.svelte'
  import { Analytics } from '@hcengineering/analytics'
  import { getCandidateIdentifier, getSequenceId } from '../utils'

  export let space: Ref<Vacancy>
  export let candidate: Ref<Candidate>
  export let assignee: Ref<Employee>
  export let comment: Markup = EmptyMarkup

  $: _comment = comment

  export let preserveCandidate = false
  export let preserveVacancy = false

  let status: Status = OK

  let _space = space

  $: _candidate = candidate

  const doc: Applicant = {
    status: '' as Ref<TaskStatus>,
    number: 0,
    assignee,
    rank: '',
    attachedTo: candidate,
    attachedToClass: recruit.mixin.Candidate,
    _class: recruit.class.Applicant,
    space,
    identifier: '',
    _id: generateId(),
    collection: 'applications',
    modifiedOn: Date.now(),
    modifiedBy: '',
    startDate: null,
    dueDate: null,
    kind: '' as Ref<TaskType>,
    isDone: false
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()
  fillDefaults(hierarchy, doc, recruit.class.Applicant)

  export function canClose (): boolean {
    return (preserveCandidate || _candidate === undefined) && assignee === undefined
  }

  async function createApplication (): Promise<void> {
    if (selectedState === undefined) {
      throw new Error(`Please select initial state:${_space}`)
    }
    const sequence = await client.findOne(core.class.Sequence, { attachedTo: recruit.class.Applicant })
    if (sequence === undefined) {
      throw new Error('sequence object not found')
    }
    if (kind === undefined) {
      throw new Error('kind is not specified')
    }

    const lastOne = await client.findOne(recruit.class.Applicant, {}, { sort: { rank: SortingOrder.Descending } })
    const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)

    const candidateInstance = await client.findOne(contact.class.Person, { _id: _candidate })
    if (candidateInstance === undefined) {
      throw new Error('contact not found')
    }

    const ops = client.apply(undefined, recruitId + '.Create.CreateApplication')

    if (!client.getHierarchy().hasMixin(candidateInstance, recruit.mixin.Candidate)) {
      await ops.createMixin<Contact, Candidate>(
        candidateInstance._id,
        candidateInstance._class,
        candidateInstance.space,
        recruit.mixin.Candidate,
        {}
      )
    }

    const number = (incResult as any).object.sequence

    await ops.addCollection(
      recruit.class.Applicant,
      _space,
      candidateInstance._id,
      recruit.mixin.Candidate,
      'applications',
      {
        ...doc,
        status: selectedState._id,
        number,
        identifier: `APP-${number}`,
        rank: makeRank(lastOne?.rank, undefined),
        kind
      },
      doc._id
    )

    await descriptionBox.createAttachments(undefined, ops)

    if (_comment.trim().length > 0 && !isEmptyMarkup(_comment)) {
      await ops.addCollection(chunter.class.ChatMessage, _space, doc._id, recruit.class.Applicant, 'comments', {
        message: _comment
      })
    }
    await ops.commit()

    Analytics.handleEvent(RecruitEvents.ApplicationCreated, {
      id: `APP-${number}`,
      talent: getCandidateIdentifier(candidateInstance._id),
      vacancy: vacancy ? getSequenceId(vacancy) : ''
    })
  }

  async function invokeValidate (
    action: Resource<<T extends Doc>(doc: T, client: Client) => Promise<Status>>
  ): Promise<Status> {
    const impl = await getResource(action)
    return await impl({ ...doc, space: _space }, client)
  }

  async function validate (
    doc: Applicant,
    space: Ref<Space>,
    _class: Ref<Class<Doc>>,
    candidate: Ref<Candidate>
  ): Promise<void> {
    if (doc.attachedTo !== _candidate) {
      doc.attachedTo = _candidate
    }
    const clazz = hierarchy.getClass(_class)
    const validatorMixin = hierarchy.as(clazz, view.mixin.ObjectValidator)
    if (validatorMixin?.validator != null) {
      status = await invokeValidate(validatorMixin.validator)
    } else if (clazz.extends != null) {
      await validate(doc, space, clazz.extends, candidate)
    } else {
      status = OK
    }
  }

  $: validate(doc, _space, doc._class, _candidate)

  let states: Array<{ id: number | string, color: number, label: string }> = []
  let selectedState: TaskStatus | undefined
  $: rawStates = getStates(vacancy, $typeStore, $statusStore.byId)
  const spaceQuery = createQuery()

  let vacancy: Vacancy | undefined
  const acc = getCurrentAccount()

  $: if (_space) {
    spaceQuery.query(recruit.class.Vacancy, { _id: _space, members: acc.uuid }, (res) => {
      vacancy = res.shift()
    })
  }

  $: if (rawStates.findIndex((it) => it._id === selectedState?._id) === -1) {
    selectedState = rawStates[0]
  }

  $: states = rawStates.map((s) => {
    return { id: s._id, label: s.name, color: s.color ?? getColorNumberByText(s.name) }
  })

  let kind: Ref<TaskType> | undefined

  const manager = createFocusManager()

  const existingApplicationsQuery = createQuery()
  let existingApplicants: Ref<Contact>[] = []
  $: existingApplicationsQuery.query(
    recruit.class.Applicant,
    {
      space: _space
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
  const orgOptions: FindOptions<Vacancy> = {
    lookup: {
      company: contact.class.Organization
    }
  }

  const candidateQuery = createQuery()
  let _candidateInstance: Person | undefined

  $: if (_candidate !== undefined) {
    candidateQuery.query(contact.class.Person, { _id: _candidate }, (res) => {
      _candidateInstance = res.shift()
    })
  } else {
    candidateQuery.unsubscribe()
  }
  let verticalContent: boolean = false
  $: verticalContent = $deviceInfo.isMobile && $deviceInfo.isPortrait
  let btn: HTMLButtonElement

  let descriptionBox: AttachmentStyledBox

  const assignAttr = getClient().getHierarchy().getAttribute(recruit.class.Applicant, 'assignee')
</script>

<FocusHandler {manager} />

<Card
  label={recruit.string.CreateApplication}
  okAction={createApplication}
  canSave={status.severity === Severity.OK}
  gap={'gapV-4'}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="title">
    <div class="flex-row-center gap-2">
      <Label label={recruit.string.CreateApplication} />
      <TaskKindSelector projectType={vacancy?.type} bind:value={kind} baseClass={recruit.class.Applicant} />
    </div>
  </svelte:fragment>
  <StatusControl slot="error" {status} />
  <div class:candidate-vacancy={!verticalContent} class:flex-col={verticalContent}>
    <div class="flex flex-stretch">
      <UserBox
        id={'vacancy.talant.selector'}
        focusIndex={1}
        readonly={preserveCandidate}
        _class={contact.class.Person}
        options={{ sort: { modifiedOn: -1 } }}
        excluded={existingApplicants}
        label={recruit.string.Talent}
        placeholder={recruit.string.Talents}
        bind:value={_candidate}
        kind={'no-border'}
        size={'small'}
        width={'100%'}
        create={{ component: recruit.component.CreateCandidate, label: recruit.string.CreateTalent }}
      >
        <svelte:fragment slot="content">
          <CandidateCard candidate={_candidateInstance} on:click disabled={true} />
        </svelte:fragment>
      </UserBox>
    </div>

    <div class="flex-center" class:rotate={verticalContent}>
      <ExpandRightDouble />
    </div>
    <div class="flex-grow">
      <SpaceSelect
        _class={recruit.class.Vacancy}
        spaceQuery={{
          archived: false,
          members: acc.uuid,
          ...($selectedTypeStore !== undefined ? { type: $selectedTypeStore } : {})
        }}
        spaceOptions={orgOptions}
        readonly={preserveVacancy}
        label={recruit.string.Vacancy}
        create={hasAccountRole(getCurrentAccount(), AccountRole.User)
          ? {
              component: recruit.component.CreateVacancy,
              label: recruit.string.CreateVacancy
            }
          : undefined}
        bind:value={_space}
        component={VacancyOrgPresenter}
        componentProps={{ inline: true }}
      >
        <svelte:fragment slot="content">
          <VacancyCard {vacancy} disabled={true} />
        </svelte:fragment>
      </SpaceSelect>
    </div>
  </div>

  {#key doc._id}
    <AttachmentStyledBox
      bind:this={descriptionBox}
      objectId={doc._id}
      shouldSaveDraft={false}
      _class={recruit.class.Applicant}
      space={_space}
      alwaysEdit
      showButtons={false}
      kind={'emphasized'}
      bind:content={_comment}
      placeholder={recruit.string.Description}
      on:changeSize={() => dispatch('changeContent')}
      on:attach={(ev) => {
        if (ev.detail.action === 'saved') {
          doc.attachments = ev.detail.value
        }
      }}
    />
  {/key}
  <svelte:fragment slot="pool">
    {#key doc}
      <EmployeeBox
        focusIndex={2}
        label={assignAttr.label}
        placeholder={assignAttr.label}
        bind:value={doc.assignee}
        allowDeselect
        showNavigate={false}
        kind={'regular'}
        size={'large'}
        titleDeselect={recruit.string.UnAssignRecruiter}
      />
      {#if states.length > 0}
        <Button
          focusIndex={3}
          width="min-content"
          size="large"
          bind:input={btn}
          on:click={() => {
            showPopup(
              ColorPopup,
              { value: states, searchable: true, placeholder: ui.string.SearchDots, selected: selectedState?._id },
              btn,
              (result) => {
                if (result?.id) {
                  selectedState = { ...result, _id: result.id, name: result.label }
                }
                manager.setFocusPos(3)
              }
            )
          }}
        >
          <div slot="content" class="flex-row-center" class:empty={!selectedState}>
            {#if selectedState}
              <div
                class="color"
                style="background: {getPlatformColorDef(
                  selectedState.color ?? getColorNumberByText(selectedState.name),
                  $themeStore.dark
                ).color}"
              />
              <span class="label overflow-label">{selectedState.name}</span>
            {:else}
              <div class="color" />
              <span class="label overflow-label"><Label label={presentation.string.NotSelected} /></span>
            {/if}
          </div>
        </Button>
      {/if}

      {#if vacancy}
        <InlineAttributeBar
          _class={recruit.class.Applicant}
          object={doc}
          toClass={core.class.AttachedDoc}
          ignoreKeys={['assignee', 'status']}
          extraProps={{ showNavigate: false, space: vacancy._id }}
        />
      {/if}
    {/key}
  </svelte:fragment>
</Card>

<style lang="scss">
  .candidate-vacancy {
    display: grid;
    grid-template-columns: 3fr 1fr 3fr;
    grid-template-rows: 1fr;
  }
  .rotate {
    transform: rotate(90deg);
  }
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

  .empty {
    .color {
      border-color: var(--content-color);
    }
    .label {
      color: var(--content-color);
    }
    &:hover .color {
      border-color: var(--accent-color);
    }
    &:hover .label {
      color: var(--accent-color);
    }
  }
</style>
