<!--
//
// Copyright © 2024 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import { MessageBox } from '@hcengineering/presentation'
  import { Question, QuestionKind, Survey } from '@hcengineering/survey'
  import { createFocusManager, EditBox, FocusHandler, Icon, Label, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import survey from '../plugin'
  import EditQuestion from './EditQuestion.svelte'
  import IconQuestion from './icons/Question.svelte'

  const dispatch = createEventDispatcher()
  const manager = createFocusManager()

  export let object: Survey
  export let readonly: boolean = false

  const emptyQuestion: Question = {
    name: '',
    kind: QuestionKind.STRING,
    isMandatory: false,
    hasCustomOption: false
  }

  let newQuestion: Question = { ...emptyQuestion }

  let newQuestionComponent: EditQuestion
  const questionComponents: EditQuestion[] = []

  function handleChange (patch: Partial<Survey>): void {
    dispatch('change', patch)
  }

  function deleteQuestion (index: number): void {
    if (!object.questions?.[index]) return
    showPopup(
      MessageBox,
      {
        label: survey.string.DeleteQuestion,
        message: survey.string.DeleteQuestionConfirm
      },
      undefined,
      async (result?: boolean) => {
        if (result === true) {
          let questions = object.questions ?? []
          questions = questions.filter((q, i) => i !== index)
          handleChange({ questions })
        }
      }
    )
  }

  function handleNewQuestionChange (patch: Partial<Question>): void {
    const question = { ...newQuestion, ...patch }

    let questions = object.questions ?? []

    questions = [...questions, question]
    newQuestion = { ...emptyQuestion }

    handleChange({ questions })
  }

  function handleQuestionChange (index: number, patch: Partial<Question>): Promise<void> | void {
    const questions = (object.questions ?? []).slice()
    questions[index] = { ...questions[index], ...patch }
    handleChange({ questions })
  }

  let draggedIndex: number | undefined = undefined
  let draggedOverIndex: number | undefined = undefined

  function onQuestionDragOver (ev: DragEvent, index: number): void {
    if (draggedIndex === undefined || draggedIndex === draggedOverIndex || draggedIndex + 1 === draggedOverIndex) {
      return
    }
    ev.preventDefault()
    draggedOverIndex = index
  }

  function onQuestionDragLeave (ev: DragEvent, index: number): void {
    if (draggedIndex === undefined) return

    ev.preventDefault()
    if (draggedOverIndex === index) draggedOverIndex = undefined
  }

  function onQuestionDrop (): void {
    if (draggedIndex === undefined || draggedOverIndex === undefined) {
      return
    }
    if (draggedIndex === draggedOverIndex || draggedIndex === draggedOverIndex - 1) {
      return
    }

    let questions = object?.questions ?? []
    const item = questions[draggedIndex]
    const other = questions.filter((_, index) => index !== draggedIndex)
    const index = draggedIndex < draggedOverIndex ? draggedOverIndex - 1 : draggedOverIndex
    questions = [...other.slice(0, index), item, ...other.slice(index)]
    questionComponents[index]?.focusQuestion()

    handleChange({ questions })
  }

  $: questionList = [...(object.questions ?? []), newQuestion]
</script>

<FocusHandler {manager} />

{#if object !== undefined}
  <div class="flex-row-center flex-no-shrink step-tb-6">
    <EditBox
      disabled={readonly}
      placeholder={survey.string.Name}
      bind:value={object.name}
      kind={'large-style'}
      on:input={() => {
        handleChange({ name: object.name })
      }}
    />
  </div>
  <div class="step-tb-6">
    <EditBox
      disabled={readonly}
      placeholder={survey.string.PromptPlaceholder}
      bind:value={object.prompt}
      on:input={() => {
        handleChange({ prompt: object.prompt })
      }}
    />
  </div>
  <div class="antiSection step-tb-6">
    <div class="antiSection-header mb-3">
      <div class="antiSection-header__icon">
        <Icon icon={IconQuestion} size={'small'} />
      </div>
      <span class="antiSection-header__title">
        <Label label={survey.string.Questions} />
      </span>
    </div>
    {#each questionList as question, index (index)}
      {@const isNewQuestion = index === questionList.length - 1}
      <div
        role="listitem"
        on:dragover={(ev) => {
          onQuestionDragOver(ev, index)
        }}
        on:dragleave={(ev) => {
          onQuestionDragLeave(ev, index)
        }}
        on:drop={onQuestionDrop}
        class:dragged-over={draggedIndex !== undefined &&
          draggedOverIndex === index &&
          draggedOverIndex !== draggedIndex &&
          draggedOverIndex !== draggedIndex + 1}
      >
        <EditQuestion
          bind:this={questionComponents[index]}
          {question}
          {isNewQuestion}
          on:delete={() => {
            deleteQuestion(index)
          }}
          on:change={(e) => {
            isNewQuestion ? handleNewQuestionChange(e.detail) : handleQuestionChange(index, e.detail)
          }}
          {readonly}
          on:dragStart={() => {
            draggedIndex = index
          }}
          on:dragEnd={() => {
            draggedIndex = undefined
            draggedOverIndex = undefined
          }}
        />
      </div>
    {/each}
  </div>
{/if}

<style lang="scss">
  div[role='listitem'] {
    margin-top: var(--spacing-1);
  }
  .dragged-over {
    transition: box-shadow 0.1s ease-in;
    box-shadow: 0 -3px 0 0 var(--primary-button-outline);
  }
</style>
