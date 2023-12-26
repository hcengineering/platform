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
  import { Button, CheckBox, EditBox, Label, Loading, tooltip } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import { Question, QuestionType, QuestionTypeInitAssessmentDataFunction } from '@hcengineering/survey'
  import { Class } from '@hcengineering/core'
  import survey from '../plugin'
  import { ComponentType } from 'svelte'
  import { getResource } from '@hcengineering/platform'
  import { questionUpdate } from '../utils/questionUpdate'
  import { deepEqual } from 'fast-equals'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import { themeStore } from '@hcengineering/theme'

  // TODO: Move to `generics` attribute when IDE supports it
  //  https://youtrack.jetbrains.com/issue/WEB-57377
  type Q = Question

  export let index: number = 0
  export let question: Q

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let questionClass: Class<Q>
  let questionType: QuestionType<Q>
  let questionEditorComponentPromise: Promise<ComponentType>
  $: if (question._class !== questionClass?._id) {
    questionClass = hierarchy.getClass<Q>(question._class)
    questionType = hierarchy.as(questionClass, survey.mixin.QuestionType)
    questionEditorComponentPromise = getResource(questionType.editor)
  }

  // A copy of current object to be passed to nested editor
  let draft: Q = question
  $: {
    const externalChangesDetected = !deepEqual(question, draft)
    if (externalChangesDetected) {
      draft = question
    }
  }

  let isPreviewing = false
  let isSubmitting = false
  let isAssessable: boolean

  $: isAssessable = draft.assessment !== null

  async function submit (data: Partial<Q>): Promise<void> {
    isSubmitting = true
    await questionUpdate(client, question, data)
    isSubmitting = false
  }

  async function onTitleChange (title: string): Promise<void> {
    draft.title = title
    await submit({ title: draft.title })
  }

  async function onWeightChange (): Promise<void> {
    await submit({ assessment: draft.assessment })
  }

  async function onAssessmentToggle (on: boolean): Promise<void> {
    if (questionType.initAssessmentData === undefined) {
      return
    }
    if (on) {
      const initAssessmentData = await getResource<QuestionTypeInitAssessmentDataFunction<Q>>(
        questionType.initAssessmentData
      )
      draft = {
        ...draft,
        assessment: await initAssessmentData($themeStore.language, hierarchy, question)
      }
    } else {
      draft = {
        ...draft,
        assessment: null
      }
    }
    await submit({ assessment: draft.assessment })
  }
</script>

<form class="root-editor pt-1 pb-6 pr-2">
  <div class="flex flex-row-center">
    <div class="flex-grow content-color">
      {index + 1}. <Label label={questionClass.label} />
    </div>
    {#if isSubmitting}
      <Loading size="inline" shrink />
    {/if}
    <Button
      icon={survey.icon.Eye}
      shape="circle"
      size="medium"
      kind={isPreviewing ? 'primary' : 'ghost'}
      on:click={() => {
        isPreviewing = !isPreviewing
      }}
    />
    <slot />
  </div>
  <div class="flex items-baseline justify-end flex-wrap">
    <div class="flex-grow text-lg mb-2">
      <!--
        TODO: Ugly hack to force complete re-render and re-mount of StyledTextBox,
          to avoid phantom format panels in nested TextEditor. See TextEditor comments for more details
      -->
      {#key index}
        <StyledTextBox
          mode={isPreviewing ? 1 : 2}
          hideExtraButtons
          isScrollable={false}
          showButtons={false}
          content={draft.title}
          on:blur={(e) => onTitleChange(e.detail)}
        />
      {/key}
    </div>
    {#if questionType.initAssessmentData !== undefined}
      <div class="flex-row-center mr-2 flex-gap-2 flex-no-shrink">
        <CheckBox
          readonly={isPreviewing}
          kind="positive"
          size="medium"
          circle
          checked={isAssessable}
          on:value={(e) => onAssessmentToggle(e.detail)}
        />
        <Label label={survey.string.Assessment} />
        {#if draft.assessment !== null}
          <div
            use:tooltip={{
              label: survey.string.QuestionWeight,
              direction: 'right'
            }}
          >
            <EditBox
              format="number"
              maxDigitsAfterPoint={1}
              kind="default"
              maxWidth="1.6rem"
              disabled={isPreviewing}
              bind:value={draft.assessment.weight}
              on:blur={onWeightChange}
            />
          </div>
        {/if}
      </div>
    {/if}
  </div>
  {#await questionEditorComponentPromise}
    <Loading />
  {:then instance}
    <svelte:component this={instance} editable={!isPreviewing} question={draft} {submit} />
  {/await}
</form>
