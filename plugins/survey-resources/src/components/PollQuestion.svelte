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
  import { generateId } from '@hcengineering/core'
  import { EditBox, Icon, Label, tooltip, ModernCheckbox, ModernRadioButton } from '@hcengineering/ui'
  import { AnsweredQuestion, QuestionKind } from '@hcengineering/survey'
  import { createEventDispatcher } from 'svelte'
  import survey from '../plugin'
  import { hasText } from '../utils'

  const dispatch = createEventDispatcher()

  export let question: AnsweredQuestion
  export let isAnswered: boolean = false
  export let readonly: boolean = false

  let answer = ''
  let selectedOption: number | undefined
  const selectedOptions: boolean[] = []
  const customOption = -1

  $: id = generateId()
  $: showAnswers(question)
  $: updateIsAnswered(question, selectedOption, selectedOptions)

  function showAnswers (question: AnsweredQuestion): void {
    if (question.kind === QuestionKind.STRING) {
      answer = question.answer ?? ''
    } else if (question.kind === QuestionKind.OPTION) {
      selectedOption = question.answers?.[0]
      if ((question.answers === undefined || question.answers === null) && typeof question.answer === 'string') {
        selectedOption = customOption
        answer = question.answer
      }
    } else if (question.kind === QuestionKind.OPTIONS) {
      question.answers?.forEach((index) => {
        selectedOptions[index] = true
      })
      if (typeof question.answer === 'string') {
        selectedOptions[customOption] = true
        answer = question.answer
      }
    }
  }

  function updateIsAnswered (
    question: AnsweredQuestion,
    selectedOption: number | undefined,
    selectedOptions: boolean[]
  ): void {
    if (!question.isMandatory) {
      isAnswered = true
      return
    }
    if (question.kind === QuestionKind.STRING) {
      isAnswered = hasText(answer)
    } else if (question.kind === QuestionKind.OPTION) {
      isAnswered = selectedOption === customOption ? hasText(answer) : selectedOption !== undefined
    } else if (question.kind === QuestionKind.OPTIONS) {
      isAnswered = selectedOptions[customOption] ? hasText(answer) : selectedOptions.some((on) => on)
    }
  }

  function answerChange (): void {
    question.answer = hasText(answer) ? answer : undefined
    dispatch('answered')
  }

  function optionChange (): void {
    if (selectedOption === undefined) {
      question.answer = undefined
      question.answers = undefined
    } else if (selectedOption === customOption) {
      question.answer = answer
      question.answers = undefined
    } else {
      question.answer = undefined
      question.answers = [selectedOption]
    }
    dispatch('answered')
  }

  function optionsChange (): void {
    const answers: number[] = []
    selectedOptions.forEach((on, index) => {
      if (on) {
        answers.push(index)
      }
    })
    question.answers = answers.length > 0 ? answers : undefined
    question.answer = selectedOptions[customOption] ? answer : undefined
    dispatch('answered')
  }

  function getReadonlyAnswers (): string[] {
    if (question.kind === QuestionKind.STRING) {
      return [answer.trim()]
    }
    if (question.kind === QuestionKind.OPTION) {
      if (selectedOption === undefined) {
        return []
      }
      if (selectedOption === customOption) {
        return [answer.trim()]
      }
      return [question.options?.[selectedOption] ?? '']
    }
    if (question.kind === QuestionKind.OPTIONS) {
      const answers: string[] = []
      question.options?.forEach((option, index) => {
        if (selectedOptions[index]) {
          answers.push(option)
        }
      })
      if (selectedOptions[customOption]) {
        answers.push(answer.trim())
      }
      return answers
    }
    return []
  }
</script>

<div class="question-answer-container flex-col flex-gap-3">
  <div class="flex-row-center flex-gap-1 flex-no-shrink">
    <strong class="text-base caption-color font-medium pre-wrap">{question.name}</strong>
    {#if question.isMandatory && !readonly}
      <div
        class="flex-no-shrink"
        style:transform={'translateY(-0.25rem)'}
        use:tooltip={{ label: survey.string.QuestionTooltipMandatory }}
      >
        <Icon icon={survey.icon.QuestionIsMandatory} size={'xx-small'} fill="var(--theme-urgent-color)" />
      </div>
    {/if}
  </div>
  {#if readonly}
    {#each getReadonlyAnswers() as answer}
      {#if answer}
        <div class="pre-wrap">{answer}</div>
      {:else}
        <div class="content-halfcontent-color">
          <Label label={survey.string.NoAnswer} />
        </div>
      {/if}
    {/each}
  {:else if question.kind === QuestionKind.OPTION}
    <div class="flex-col flex-gap-2 px-6">
      {#each question.options ?? [] as option, i}
        <ModernRadioButton
          id={`${id}-${i}`}
          value={i}
          label={option}
          bind:group={selectedOption}
          on:change={optionChange}
        />
      {/each}
      {#if question.hasCustomOption}
        <ModernRadioButton
          id={`${id}-custom`}
          value={customOption}
          labelIntl={survey.string.AnswerCustomOption}
          bind:group={selectedOption}
          on:change={optionChange}
        />
        {#if selectedOption === customOption}
          <div class="pl-6">
            <EditBox
              bind:value={answer}
              placeholder={survey.string.AnswerPlaceholder}
              focusable
              autoFocus
              on:change={answerChange}
            />
          </div>
        {/if}
      {/if}
    </div>
  {:else if question.kind === QuestionKind.OPTIONS}
    <div class="flex-col flex-gap-2 px-6">
      {#each question.options ?? [] as option, i}
        <ModernCheckbox id={`${id}-${i}`} label={option} bind:checked={selectedOptions[i]} on:change={optionsChange} />
      {/each}
      {#if question.hasCustomOption}
        <ModernCheckbox
          id={`${id}-custom`}
          labelIntl={survey.string.AnswerCustomOption}
          bind:checked={selectedOptions[customOption]}
          on:change={optionsChange}
        />
        {#if selectedOptions[customOption]}
          <div class="pl-6">
            <EditBox
              bind:value={answer}
              placeholder={survey.string.AnswerPlaceholder}
              focusable
              autoFocus
              on:change={answerChange}
            />
          </div>
        {/if}
      {/if}
    </div>
  {:else}
    <div>
      <EditBox
        format={'text-multiline'}
        bind:value={answer}
        placeholder={survey.string.AnswerPlaceholder}
        on:change={answerChange}
      />
    </div>
  {/if}
</div>

<style lang="scss">
  :global(.question-answer-container + .question-answer-container) {
    padding-top: var(--spacing-2);
    border-top: 1px solid var(--theme-divider-color);
  }
  .pre-wrap {
    white-space: pre-wrap;
  }
</style>
