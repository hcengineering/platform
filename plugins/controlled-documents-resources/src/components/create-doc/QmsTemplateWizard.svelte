<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createEventDispatcher, onDestroy } from 'svelte'
  import {
    ChangeControl,
    ControlledDocument,
    DEFAULT_PERIODIC_REVIEW_INTERVAL,
    DEFAULT_SECTION_TITLE,
    DocumentState,
    DocumentTemplate,
    TEMPLATE_PREFIX,
    createChangeControl,
    createDocumentTemplate
  } from '@hcengineering/controlled-documents'
  import { Employee, PersonAccount } from '@hcengineering/contact'
  import {
    type AttachedData,
    type Class,
    type Data,
    type Ref,
    type Mixin,
    generateId,
    getCurrentAccount,
    makeCollaborativeDoc
  } from '@hcengineering/core'
  import { MessageBox, getClient } from '@hcengineering/presentation'
  import {
    AnySvelteComponent,
    addNotification,
    navigate,
    showPopup,
    NotificationSeverity,
    ModernWizardDialog,
    type IWizardStep
  } from '@hcengineering/ui'
  import { getCurrentLanguage } from '@hcengineering/theme'
  import { translate } from '@hcengineering/platform'

  import documents from '../../plugin'
  import { getProjectDocumentLink } from '../../navigation'
  import InfoStep from './steps/InfoStep.svelte'
  import LocationStep from './steps/LocationStep.svelte'
  import TeamStep from './steps/TeamStep.svelte'
  import {
    TemplateWizardStep,
    $currentStep as currentStep,
    $locationStep as locationStep,
    currentStepUpdated,
    wizardClosed
  } from '../../stores/wizards/create-document'
  import FailedToCreateDocument from '../FailedToCreateDocument.svelte'

  export let _class: Ref<Class<ControlledDocument>> = documents.class.ControlledDocument
  export let _templateMixin: Ref<Mixin<DocumentTemplate>> = documents.mixin.DocumentTemplate

  onDestroy(wizardClosed)

  const dispatch = createEventDispatcher()
  const client = getClient()
  const currentUser = getCurrentAccount() as PersonAccount

  const steps: IWizardStep<TemplateWizardStep>[] = [
    {
      id: 'location',
      title: documents.string.LocationStepTitle
    },
    {
      id: 'info',
      title: documents.string.InfoStepTitle
    },
    {
      id: 'team',
      title: documents.string.TeamStepTitle
    }
  ]

  // eslint-disable-next-line no-unused-vars
  const stepComponents: { [key in TemplateWizardStep]: AnySvelteComponent } = {
    location: LocationStep,
    info: InfoStep,
    team: TeamStep
  }

  const ccRecordId = generateId<ChangeControl>()
  const ccRecord: Data<ChangeControl> = {
    description: '',
    reason: '',
    impact: '',
    impactedDocuments: []
  }

  const docObject: AttachedData<ControlledDocument> & Pick<DocumentTemplate, 'docPrefix'> = {
    prefix: TEMPLATE_PREFIX,
    title: '',
    code: '',
    docPrefix: '',
    labels: 0,
    major: 0,
    minor: 1,
    commentSequence: 0,
    seqNumber: 0,
    category: undefined,
    abstract: '',
    author: currentUser.person as Ref<Employee>,
    owner: currentUser.person as Ref<Employee>,
    state: DocumentState.Draft,
    sections: 0,
    snapshots: 0,
    changeControl: ccRecordId,
    content: makeCollaborativeDoc(generateId()),

    requests: 0,
    reviewers: [],
    approvers: [],
    coAuthors: [],
    plannedEffectiveDate: 0,
    reviewInterval: DEFAULT_PERIODIC_REVIEW_INTERVAL
  }

  let canProceed: false // Note: determined by individual steps
  const isLoading = false

  function getCurrentStepComponent (currentStep: TemplateWizardStep): AnySvelteComponent {
    return stepComponents[currentStep]
  }

  function handleStepChanged (e: CustomEvent): void {
    currentStepUpdated(e.detail)
  }

  async function handleSubmit (): Promise<void> {
    if ($locationStep.space === undefined || $locationStep.project === undefined) {
      return
    }

    const { category } = docObject
    if (category === undefined || category === null) return

    const newDocId = generateId<ControlledDocument>()
    const space = $locationStep.space
    const spec = { ...docObject }

    delete (spec as any).docPrefix

    const { success } = await createDocumentTemplate(
      client,
      _class,
      space,
      _templateMixin,
      $locationStep.project,
      $locationStep.parent,
      newDocId,
      docObject.docPrefix,
      spec,
      category,
      currentUser.person as Ref<Employee>,
      { title: DEFAULT_SECTION_TITLE }
    )

    if (!success) {
      addNotification(
        await translate(documents.string.CreateDocumentTemplateFailed, {}, getCurrentLanguage()),
        '',
        FailedToCreateDocument,
        undefined,
        NotificationSeverity.Error
      )

      dispatch('close')
      return
    }

    await createChangeControl(client, ccRecordId, ccRecord, space)

    const loc = getProjectDocumentLink(newDocId, $locationStep.project)
    navigate(loc)

    dispatch('close')
  }

  $: space = $locationStep.space

  async function handleClose (): Promise<void> {
    showPopup(
      MessageBox,
      {
        label: documents.string.NewDocumentDialogClose,
        message: documents.string.NewDocumentCloseNote
      },
      'top',
      (result?: boolean) => {
        if (result === true) {
          dispatch('close')
        }
      }
    )
  }

  $: currentTemplateStep = $currentStep as TemplateWizardStep
</script>

<ModernWizardDialog
  loading={isLoading}
  label={documents.string.NewDocumentTemplate}
  submitLabel={documents.string.CreateDraft}
  {canProceed}
  {steps}
  selectedStep={currentTemplateStep}
  on:stepChanged={handleStepChanged}
  on:submit={handleSubmit}
  on:close={handleClose}
>
  <div class="root">
    <svelte:component
      this={getCurrentStepComponent(currentTemplateStep)}
      bind:canProceed
      {docObject}
      {ccRecord}
      {space}
      isTemplate
    />
  </div>
</ModernWizardDialog>

<style lang="scss">
  .root {
    height: 29.25rem;
  }
</style>
