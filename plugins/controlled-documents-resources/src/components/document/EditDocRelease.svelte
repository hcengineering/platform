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
  import { DateRangeMode, type MixinUpdate, Timestamp } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import {
    DatePresenter,
    DropdownLabels,
    Label,
    DropdownTextItem,
    RadioButton,
    Scroller,
    Toggle
  } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import { UserBoxItems } from '@hcengineering/contact-resources'
  import {
    type Document,
    ControlledDocumentState,
    DEFAULT_PERIODIC_REVIEW_INTERVAL,
    DocumentState,
    type DocumentTraining,
    periodicReviewIntervals,
    ControlledDocument
  } from '@hcengineering/controlled-documents'
  import {
    NullablePositiveNumberEditor,
    TrainingRefEditor,
    TrainingRequestRolesEditor
  } from '@hcengineering/training-resources'
  import { createDocumentTraining, getDocumentTrainingClass, updateDocumentTraining } from '../../docutils'

  import documentsRes from '../../plugin'
  import {
    $isDocumentOwner as isDocumentOwner,
    $controlledDocument as controlledDocument,
    $documentState as documentState,
    $documentAllVersionsDescSorted as documentAllVersionsDescSorted,
    $documentTraining as documentTraining
  } from '../../stores/editors/document/editor'

  enum Severity {
    Minor = 'minor',
    Major = 'major'
  }

  const client = getClient()

  // async function changePlannedEffectiveDate (plannedEffectiveDate: Timestamp) {
  //   if (!$controlledDocument) {
  //     return
  //   }

  //   await client.update($controlledDocument, { plannedEffectiveDate })
  // }

  // let selectedDate: Timestamp =
  //   $controlledDocument?.plannedEffectiveDate != null && $controlledDocument?.plannedEffectiveDate > 0
  //     ? $controlledDocument.plannedEffectiveDate
  //     : Date.now()

  let selected: IntlString | undefined = undefined
  if ($controlledDocument?.plannedEffectiveDate === 0) {
    selected = documentsRes.string.EffectiveImmediately
  } else if ($controlledDocument?.plannedEffectiveDate != null) {
    selected = documentsRes.string.EffectiveOn
  }

  // async function changeSelectedDate (ev: CustomEvent) {
  //   if (ev.detail !== undefined) {
  //     selectedDate = ev.detail
  //     await changePlannedEffectiveDate(ev.detail)
  //     selected = documentsRes.string.EffectiveOn
  //   }
  // }

  const reviewIntervals: DropdownTextItem[] = []
  for (const interval of periodicReviewIntervals) {
    reviewIntervals.push({
      id: interval.toString(),
      label: interval.toString()
    })
  }

  // let selectedReviewInterval = $controlledDocument?.reviewInterval
  //   ? $controlledDocument.reviewInterval.toString()
  //   : DEFAULT_PERIODIC_REVIEW_INTERVAL.toString()
  // async function changePeriodicReviewInterval (interval?: string) {
  //   if ($controlledDocument == null || interval == null) {
  //     return
  //   }

  //   const reviewInterval = Number(+interval)
  //   if (!Number.isSafeInteger(reviewInterval)) {
  //     return
  //   }

  //   await client.update($controlledDocument, { reviewInterval })
  //   selectedReviewInterval = interval.toString()
  // }

  $: canEdit =
    $isDocumentOwner &&
    $documentState != null &&
    ![
      DocumentState.Archived,
      DocumentState.Deleted,
      DocumentState.Effective,
      DocumentState.Obsolete,
      ControlledDocumentState.InApproval,
      ControlledDocumentState.Approved,
      ControlledDocumentState.ToReview
    ].includes($documentState)

  const hierarchy = client.getHierarchy()
  const documentTrainingClass = getDocumentTrainingClass(hierarchy)

  async function toggleTraining (on: boolean): Promise<void> {
    if (!$controlledDocument || !canEdit) {
      return
    }

    if (on) {
      if ($documentTraining === null) {
        await createDocumentTraining(client, $controlledDocument, {
          enabled: true,
          training: null,
          roles: [],
          trainees: [],
          maxAttempts: null,
          dueDays: null
        })
      } else {
        await updateTraining({ enabled: true })
      }
    } else {
      await updateTraining({ enabled: false })
    }
  }

  async function updateTraining (update: MixinUpdate<Document, DocumentTraining>): Promise<boolean> {
    if (!$controlledDocument || !canEdit || !documentTraining) {
      return false
    }
    await updateDocumentTraining(client, $controlledDocument, update)
    return true
  }

  $: severity = getSeverity($controlledDocument, $documentAllVersionsDescSorted)

  function getPreviousDocument (
    document: ControlledDocument,
    allVersionsDesc: ControlledDocument[]
  ): ControlledDocument | undefined {
    return allVersionsDesc.find(
      (d) => (d.major === document.major && d.minor < document.minor) || d.major < document.major
    )
  }

  function getSeverity (document: ControlledDocument | null, allVersionsDesc: ControlledDocument[]): Severity {
    if (document == null) {
      return Severity.Minor
    }

    const prevDocument = getPreviousDocument(document, allVersionsDesc)

    if (prevDocument == null) {
      return document.major > 0 ? Severity.Major : Severity.Minor
    } else {
      return prevDocument.major < document.major ? Severity.Major : Severity.Minor
    }
  }

  function getVersionForSeverity (severity: Severity): { major: number, minor: number } | undefined {
    if ($controlledDocument == null) {
      return
    }

    const prevDocument = getPreviousDocument($controlledDocument, $documentAllVersionsDescSorted)

    if (severity === Severity.Major) {
      return {
        major: (prevDocument?.major ?? 0) + 1,
        minor: 0
      }
    } else {
      return {
        major: prevDocument?.major ?? 0,
        minor: (prevDocument?.minor ?? 0) + 1
      }
    }
  }

  async function handleSeverityChanged (newSeverity: Severity): Promise<void> {
    if (!canEdit || $controlledDocument == null) {
      return
    }

    const oldSeverity = getSeverity($controlledDocument, $documentAllVersionsDescSorted)
    if (oldSeverity === newSeverity) {
      return
    }

    const versionUpdate = getVersionForSeverity(newSeverity)
    if (versionUpdate === undefined) {
      return
    }

    await client.update($controlledDocument, versionUpdate)
  }
</script>

<Scroller>
  <div class="content">
    <section class="section">
      <header class="fs-title text-lg mb-4">
        <Label label={documentsRes.string.ChangeSeverity} />
      </header>
      <div class="flex-col">
        <RadioButton
          group={severity}
          id={Severity.Minor}
          labelIntl={documentsRes.string.Minor}
          labelGap="large"
          value={Severity.Minor}
          disabled={!canEdit}
          action={() => {
            void handleSeverityChanged(Severity.Minor)
          }}
          gap="large"
        />
        <RadioButton
          group={severity}
          id={Severity.Major}
          labelIntl={documentsRes.string.Major}
          labelGap="large"
          value={Severity.Major}
          disabled={!canEdit}
          action={() => {
            void handleSeverityChanged(Severity.Major)
          }}
          gap="none"
        />
      </div>
      <!-- <header class="fs-title text-lg my-4">
        <Label label={documentsRes.string.EffectiveDocumentLifecycle} />
      </header>
      <span class="fs-title text-normal">
        <Label label={documentsRes.string.EffectiveDate} />
      </span>
      <div>
        <div class="flex-col">
          <RadioButton
            bind:group={selected}
            id={documentsRes.string.EffectiveImmediately}
            labelIntl={documentsRes.string.EffectiveImmediately}
            labelGap="large"
            value={documentsRes.string.EffectiveImmediately}
            disabled={!canEdit}
            action={() => {
              selected = documentsRes.string.EffectiveImmediately
              changePlannedEffectiveDate(0)
            }}
            gap="large"
          />
          <RadioButton
            bind:group={selected}
            id={documentsRes.string.EffectiveOn}
            labelGap="large"
            value={documentsRes.string.EffectiveOn}
            disabled={!canEdit}
            action={() => {
              selected = documentsRes.string.EffectiveOn
              changePlannedEffectiveDate(selectedDate)
            }}
            gap="none"
          >
            <div class="flex-row-center flex-gap-1">
              <Label label={documentsRes.string.EffectiveOn} />
              <DatePresenter
                mode={DateRangeMode.DATETIME}
                bind:value={selectedDate}
                on:change={changeSelectedDate}
                editable={canEdit}
              />
            </div>
          </RadioButton>
        </div>
      </div>
      <div class="flex-row-center flex-gap-2">
        <span class="whitespace-nowrap fs-title text-normal">
          <Label label={documentsRes.string.PeriodicReviewToBeCompleted} />
        </span>
        <DropdownLabels
          kind="regular"
          selected={selectedReviewInterval}
          placeholder={documentsRes.string.PeriodicReviewToBeCompleted}
          items={reviewIntervals}
          enableSearch={false}
          multiselect={false}
          allowDeselect={false}
          on:selected={({ detail }) => changePeriodicReviewInterval(detail)}
          disabled={!canEdit}
        />
        <span>
          <Label label={documentsRes.string.MonthsAfterEffectiveDate} />
        </span>
      </div>
    </section> -->

      <section class="section pb-16">
        <header class="flex-row-center my-4 flex-gap-4">
          <span class="fs-title text-lg">
            <Label label={documentTrainingClass.label} />
          </span>

          <Toggle
            disabled={!canEdit}
            on={$documentTraining?.enabled}
            on:change={(event) => toggleTraining(event.detail)}
          />
        </header>

        {#if $documentTraining !== null && $documentTraining.enabled}
          {@const trainingAttribute = hierarchy.getAttribute(documentTrainingClass._id, 'training')}
          <span class="fs-title text-normal">
            <Label label={trainingAttribute.label} />
          </span>
          <TrainingRefEditor
            kind="regular"
            width="min-content"
            size="medium"
            readonly={!canEdit}
            value={$documentTraining.training}
            onChange={(trainingRef) => {
              void updateTraining({ training: trainingRef ?? null })
            }}
          />

          {@const rolesAttribute = hierarchy.getAttribute(documentTrainingClass._id, 'roles')}
          <span class="fs-title text-normal">
            <Label label={rolesAttribute.label} />
          </span>
          <TrainingRequestRolesEditor
            kind="regular"
            width="max-content"
            value={$documentTraining.roles}
            onChange={(roles) => {
              void updateTraining({ roles })
            }}
          />

          {@const traineesAttribute = hierarchy.getAttribute(documentTrainingClass._id, 'trainees')}
          <span class="fs-title text-normal">
            <Label label={traineesAttribute.label} />
          </span>
          <UserBoxItems
            items={$documentTraining.trainees}
            label={traineesAttribute.label}
            readonly={!canEdit}
            size="card"
            on:update={(event) => {
              void updateTraining({ trainees: event.detail })
            }}
          />

          <div class="flex-row-center flex-gap-2">
            <span class="whitespace-nowrap fs-title text-normal">
              <Label label={documentsRes.string.ToBePassedWithin} />
            </span>
            <NullablePositiveNumberEditor
              kind="regular"
              width="min-content"
              value={$documentTraining.maxAttempts}
              readonly={!canEdit}
              onChange={(maxAttempts) => {
                void updateTraining({ maxAttempts })
              }}
            />
            <Label label={documentsRes.string.AttemptsAnd} />
            <NullablePositiveNumberEditor
              kind="regular"
              width="min-content"
              value={$documentTraining.dueDays}
              readonly={!canEdit}
              onChange={(dueDays) => {
                void updateTraining({ dueDays })
              }}
            />
            <Label label={documentsRes.string.DaysAfterEffectiveDate} />
          </div>
        {/if}
      </section>
    </section>
  </div>
</Scroller>

<style lang="scss">
  .content {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    gap: 2rem;
    min-width: 0;
    min-height: 0;
    padding: 1.5rem 3.25rem 4rem;
  }

  .section {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    flex-wrap: nowrap;
    gap: 1rem;
    min-width: 0;
    min-height: 0;
  }
</style>
