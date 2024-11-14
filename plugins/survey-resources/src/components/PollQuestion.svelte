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
  import { EditBox, Icon, Label, tooltip } from '@hcengineering/ui'
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

<div class="antiSection">
  <div class="antiSection-header">
    <span class="antiSection-header__title" style="display:flex">
      {question.name}
      {#if question.isMandatory && !readonly}
        <span style="margin-left:0.25em" use:tooltip={{ label: survey.string.QuestionTooltipMandatory }}>
          <Icon icon={survey.icon.QuestionIsMandatory} size="tiny" fill="var(--theme-urgent-color)" />
        </span>
      {/if}
    </span>
  </div>
  {#if readonly}
    {#each getReadonlyAnswers() as answer}
      {#if answer}
        <div class="answer">{answer}</div>
      {:else}
        <div class="answer empty">
          <Label label={survey.string.NoAnswer} />
        </div>
      {/if}
    {/each}
  {:else if question.kind === QuestionKind.OPTION}
    {#each question.options ?? [] as option, i}
      <div class="option">
        <input type="radio" id={`${id}-${i}`} value={i} bind:group={selectedOption} on:change={optionChange} />
        <label class="option__label" for={`${id}-${i}`}>
          {option}
        </label>
      </div>
    {/each}
    {#if question.hasCustomOption}
      <div class="option">
        <input
          type="radio"
          id={`${id}-custom`}
          value={customOption}
          bind:group={selectedOption}
          on:change={optionChange}
        />
        <label class="option__label" for={`${id}-custom`}>
          <Label label={survey.string.AnswerCustomOption} />
        </label>
        {#if selectedOption === customOption}
          <div class="option__custom">
            <EditBox bind:value={answer} on:change={answerChange} placeholder={survey.string.AnswerPlaceholder} />
          </div>
        {/if}
      </div>
    {/if}
  {:else if question.kind === QuestionKind.OPTIONS}
    {#each question.options ?? [] as option, i}
      <div class="option">
        <input type="checkbox" id={`${id}-${i}`} bind:checked={selectedOptions[i]} on:change={optionsChange} />
        <label class="option__label" for={`${id}-${i}`}>
          {option}
        </label>
      </div>
    {/each}
    {#if question.hasCustomOption}
      <div class="option">
        <input
          type="checkbox"
          id={`${id}-custom`}
          bind:checked={selectedOptions[customOption]}
          on:change={optionsChange}
        />
        <label class="option__label" for={`${id}-custom`}>
          <Label label={survey.string.AnswerCustomOption} />
        </label>
        {#if selectedOptions[customOption]}
          <div class="option__custom">
            <EditBox bind:value={answer} on:change={answerChange} placeholder={survey.string.AnswerPlaceholder} />
          </div>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="option">
      <EditBox bind:value={answer} on:change={answerChange} placeholder={survey.string.AnswerPlaceholder} />
    </div>
  {/if}
</div>

<style lang="scss">
  .option {
    margin-left: 1em;
    margin-top: 0.5em;
  }
  .option__label {
    cursor: pointer;
    margin-left: 0.25em;
  }
  .option__custom {
    margin-left: 2em;
    margin-top: 0.5em;
  }
  .answer {
    margin-left: 2em;
    margin-top: 0.5em;

    &.empty {
      opacity: 0.7;
    }
  }
</style>
