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
  import { Button, EditBox, RadioButton, IconDelete, IconAdd } from '@hcengineering/ui'
  import {
    AssessmentDataOf,
    type QuestionTypeEditorComponentProps,
    type SingleChoiceQuestion
  } from '@hcengineering/survey'

  /**
   * Declared $$Props help TypeScript ensure that your component properly implements {@link QuestionTypeEditorComponentType}
   * @see https://raqueebuddinaziz.com/blog/svelte-type-events-slots-and-props/#restprops-props
   */
  interface $$Props extends QuestionTypeEditorComponentProps<SingleChoiceQuestion> {}

  export let question: SingleChoiceQuestion
  export let editable = true
  export let submit: (data: Partial<SingleChoiceQuestion>) => Promise<void>

  const inputs: EditBox[] = []

  let draft: string = ''

  function appendOption (): void {
    update({
      options: [...question.options, { label: draft }]
    })
    setTimeout(() => {
      inputs[question.options.length - 1].focus()
      draft = ''
    })
  }

  function removeOptionAt (index: number): void {
    if (question.options.length < 1) {
      return
    }
    const nextOptions = [...question.options.slice(0, index), ...question.options.slice(index + 1)]
    const prevAssessment: AssessmentDataOf<SingleChoiceQuestion> | null = question.assessment
    let nextAssessment = prevAssessment
    if (prevAssessment !== null) {
      nextAssessment = {
        ...prevAssessment,
        correctAnswer: {
          ...prevAssessment.correctAnswer,
          selection: prevAssessment.correctAnswer.selection === index ? null : prevAssessment.correctAnswer.selection
        }
      }
    }
    update({
      options: nextOptions,
      assessment: nextAssessment
    })
  }

  function update (data: Partial<SingleChoiceQuestion> = {}): void {
    question = { ...question, ...data }
    void submit(question)
  }

  function toggleIndex (index: number, on: boolean): boolean | undefined {
    if (question.assessment === null) {
      return undefined
    }
    let nextSelection = question.assessment.correctAnswer.selection
    if (on) {
      nextSelection = index
    } else if (index === question.assessment.correctAnswer.selection) {
      nextSelection = null
    }
    update({
      assessment: {
        ...question.assessment,
        correctAnswer: {
          ...question.assessment.correctAnswer,
          selection: nextSelection
        }
      }
    })
  }
</script>

<div>
  {#each question.options as _, index (index)}
    <div class="flex flex-row-center flex-stretch flex-gap-1 my-1">
      <div class="flex min-w-8 pl-2">
        {#if question.assessment === null}
          <RadioButton group={null} value={index} disabled labelOverflow />
        {:else}
          <RadioButton
            group={question.assessment.correctAnswer.selection}
            value={index}
            labelOverflow
            disabled={!editable}
            action={() => toggleIndex(index, true)}
          />
        {/if}
      </div>
      <EditBox
        kind="default"
        fullSize
        bind:value={question.options[index].label}
        bind:this={inputs[index]}
        on:change={() => {
          update()
        }}
        disabled={!editable}
      />
      {#if editable && question.options.length > 1}
        <Button
          icon={IconDelete}
          kind="ghost"
          shape="circle"
          size="medium"
          on:click={() => {
            removeOptionAt(index)
          }}
        />
      {/if}
    </div>
  {/each}

  {#if editable}
    <div class="flex flex-row-center flex-stretch flex-gap-1 my-1">
      <div class="flex min-w-8 pl-2">
        <RadioButton group={null} value={-1} label="" disabled />
      </div>
      <EditBox
        kind="default"
        fullSize
        bind:value={draft}
        on:input={() => {
          appendOption()
        }}
      />
      <Button
        icon={IconAdd}
        kind="ghost"
        shape="circle"
        size="medium"
        on:click={() => {
          appendOption()
        }}
      />
    </div>
  {/if}
</div>
