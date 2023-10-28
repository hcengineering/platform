<script lang="ts">
  import {
    Account,
    Class,
    Client,
    Doc,
    FindOptions,
    Markup,
    Ref,
    SortingOrder,
    Space,
    fillDefaults,
    generateId
  } from '@hcengineering/core'
  import {
    Button,
    Component,
    createFocusManager,
    EditBox,
    IconFile as FileIcon,
    FocusHandler,
    getColorNumberByText,
    IconAttachment,
    IconInfo,
    Label,
    showPopup,
    Spinner
  } from '@hcengineering/ui'
  import presentation, {
    Card,
    InlineAttributeBar,
    SpaceSelect,
    createQuery,
    getClient
  } from '@hcengineering/presentation'
  import recruit from '../plugin'

  import { OK, Resource, Severity, Status, getResource } from '@hcengineering/platform'


  import type { Interview, Candidate, Vacancy } from '@hcengineering/recruit'
  import type { Contact, Employee, Person } from '@hcengineering/contact'

  import { createEventDispatcher, onDestroy } from 'svelte'

  export let space: Ref<Vacancy>
  export let candidate: Ref<Candidate>
  export let assignee: Ref<Employee>

  const doc: Interview = {
    assignee,
    attachedTo: candidate,
    _class: recruit.class.Interview,
    space,
    _id: generateId(),
    modifiedOn: Date.now(),
    modifiedBy: '' as Ref<Account>,
    title: '',
    date: 0,
    tasks: 0,
    status: '',
    verdict: ''
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()
  fillDefaults(hierarchy, doc, recruit.class.Applicant)

  function createInterview() {

  }

  function showConfirmationDialog() {}

  let loading = true;
</script>

<Card
  label={recruit.string.CreateInterview}
  okAction={createInterview}
  canSave={!loading}
  on:close={() => {
    dispatch('close')
  }}
  onCancel={showConfirmationDialog}
  on:changeContent
>

</Card>