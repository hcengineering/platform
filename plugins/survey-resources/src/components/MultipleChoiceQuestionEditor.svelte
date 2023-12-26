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
  import { Button, EditBox, IconDelete, IconAdd, CheckBox } from '@hcengineering/ui'
  import {
    AssessmentDataOf,
    type MultipleChoiceQuestion,
    type QuestionTypeEditorComponentProps
  } from '@hcengineering/survey'

  /**
   * Declared $$Props help TypeScript ensure that your component properly implements {@link QuestionTypeEditorComponentType}
   * @see https://raqueebuddinaziz.com/blog/svelte-type-events-slots-and-props/#restprops-props
   */
  interface $$Props extends QuestionTypeEditorComponentProps<MultipleChoiceQuestion> {}

  export let question: MultipleChoiceQuestion
  export let editable = true
  export let submit: (data: Partial<MultipleChoiceQuestion>) => Promise<void>

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
    const prevAssessment: AssessmentDataOf<MultipleChoiceQuestion> | null = question.assessment
    let nextAssessment = prevAssessment
    if (prevAssessment !== null) {
      const selections = prevAssessment.correctAnswer.selections
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i))

      nextAssessment = {
        ...prevAssessment,
        correctAnswer: {
          ...prevAssessment.correctAnswer,
          selections
        }
      }
    }
    update({
      options: nextOptions,
      assessment: nextAssessment
    })
  }

  function update (data: Partial<MultipleChoiceQuestion> = {}): void {
    question = { ...question, ...data }
    void submit(question)
  }

  function toggleIndex (index: number, on: boolean): boolean | undefined {
    if (question.assessment === null) {
      return undefined
    }
    const selections = new Set(question.assessment.correctAnswer.selections)
    if (on) {
      selections.add(index)
    } else {
      selections.delete(index)
    }
    update({
      assessment: {
        ...question.assessment,
        correctAnswer: {
          ...question.assessment.correctAnswer,
          selections: Array.from(selections)
        }
      }
    })
  }
</script>

<div>
  {#each question.options as _, index (index)}
    <div class="flex flex-row-center flex-stretch flex-gap-1 my-1">
      <div class="flex min-w-8 pl-2">
        <CheckBox
          readonly={!editable || question.assessment === null}
          size="medium"
          checked={question.assessment !== null && question.assessment.correctAnswer.selections.includes(index)}
          on:value={(e) => {
            toggleIndex(index, e.detail)
          }}
        />
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
        <CheckBox readonly size="medium" />
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
