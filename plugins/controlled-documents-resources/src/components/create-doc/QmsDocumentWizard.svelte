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
  import { Employee, PersonAccount } from '@hcengineering/contact'
  import {
    generateId,
    getCurrentAccount,
    makeCollaborativeDoc,
    type AttachedData,
    type Class,
    type Data,
    type Ref
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
  import {
    type ChangeControl,
    type ControlledDocument,
    type DocumentCategory,
    type DocumentTemplate,
    DocumentState,
    createChangeControl,
    createControlledDocFromTemplate,
    DEFAULT_PERIODIC_REVIEW_INTERVAL
  } from '@hcengineering/controlled-documents'

  import documents from '../../plugin'
  import { getProjectDocumentLink } from '../../navigation'
  import InfoStep from './steps/InfoStep.svelte'
  import LocationStep from './steps/LocationStep.svelte'
  import TeamStep from './steps/TeamStep.svelte'
  import TemplateStep from './steps/TemplateStep.svelte'
  import {
    type DocumentWizardStep,
    $currentStep as currentStep,
    $locationStep as locationStep,
    wizardClosed,
    currentStepUpdated
  } from '../../stores/wizards/create-document'
  import FailedToCreateDocument from '../FailedToCreateDocument.svelte'

  export let _class: Ref<Class<ControlledDocument>> = documents.class.ControlledDocument

  onDestroy(wizardClosed)

  const dispatch = createEventDispatcher()
  const client = getClient()
  const currentUser = getCurrentAccount() as PersonAccount

  const steps: IWizardStep<DocumentWizardStep>[] = [
    {
      id: 'location',
      title: documents.string.LocationStepTitle
    },
    {
      id: 'template',
      title: documents.string.TemplateStepTitle
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
  const stepComponents: { [key in DocumentWizardStep]: AnySvelteComponent } = {
    location: LocationStep,
    template: TemplateStep,
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

  const docObject: AttachedData<ControlledDocument> = {
    template: '' as Ref<DocumentTemplate>,
    prefix: '',
    code: '',
    title: '',
    labels: 0,
    major: 0,
    minor: 1,
    seqNumber: 0,
    commentSequence: 0,
    category: '' as Ref<DocumentCategory>,
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

  function getStepComponent (step: DocumentWizardStep): AnySvelteComponent {
    return stepComponents[step]
  }

  function handleStepChanged (e: CustomEvent): void {
    currentStepUpdated(e.detail)
  }

  $: space = $locationStep.space

  async function handleSubmit (): Promise<void> {
    if ($locationStep.space === undefined || $locationStep.project === undefined) {
      return
    }

    const newDocId = generateId<ControlledDocument>()
    const _space = $locationStep.space

    const { success } = await createControlledDocFromTemplate(
      client,
      docObject.template,
      newDocId,
      docObject,
      _space,
      $locationStep.project,
      $locationStep.parent
    )

    if (!success) {
      addNotification(
        await translate(documents.string.CreateDocumentFailed, {}, getCurrentLanguage()),
        '',
        FailedToCreateDocument,
        undefined,
        NotificationSeverity.Error
      )

      dispatch('close')
      return
    }

    await createChangeControl(client, ccRecordId, ccRecord, _space)

    const loc = getProjectDocumentLink(newDocId, $locationStep.project)
    navigate(loc)

    dispatch('close')
  }

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
</script>

<ModernWizardDialog
  loading={isLoading}
  label={documents.string.NewDocument}
  submitLabel={documents.string.CreateDraft}
  {canProceed}
  {steps}
  selectedStep={$currentStep}
  on:stepChanged={handleStepChanged}
  on:submit={handleSubmit}
  on:close={handleClose}
>
  <div class="root">
    <svelte:component this={getStepComponent($currentStep)} bind:canProceed {docObject} {ccRecord} {space} />
  </div>
</ModernWizardDialog>

<style lang="scss">
  .root {
    height: 29.25rem;
  }
</style>
