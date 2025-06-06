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
  import { AnsweredQuestion, QuestionKind } from '@hcengineering/survey'
  import { EditBox, Icon, Label, ModernCheckbox, ModernRadioButton, tooltip } from '@hcengineering/ui'
  import { deepEqual } from 'fast-equals'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import survey from '../plugin'
  import { hasText } from '../utils'

  const dispatch = createEventDispatcher()

  export let question: AnsweredQuestion
  export let isAnswered: boolean = false
  export let readonly: boolean = false

  const customOption = -1

  interface InputState {
    answer: string
    option?: number
    options: boolean[]
  }

  const input: InputState = {
    answer: '',
    option: undefined,
    options: (question.options ?? []).map(() => false)
  }

  $: id = generateId()
  $: syncInputState(question)
  $: validateAnswer(question, input)

  function flush (): void {
    const patch: Partial<AnsweredQuestion> = {}
    let haveChanges = false

    const current = extractCurrentAnswerSet(input)
    if (!isSameAnswers(current, question)) {
      patch.answer = current.answer
      patch.answers = current.answers
      haveChanges = true
    }

    if (haveChanges) handleChange(patch)
  }
  onDestroy(flush)

  function syncInputState (question: AnsweredQuestion): void {
    const current = extractCurrentAnswerSet(input)
    if (isSameAnswers(current, question)) return

    input.answer = question.answer ?? ''
    input.option =
      question.kind === QuestionKind.OPTION
        ? typeof question.answer === 'string'
          ? customOption
          : question.answers?.[0]
        : undefined

    const answerIds = new Set(question.answers ?? [])
    input.options = (question.options ?? []).map((_, idx) => answerIds.has(idx))

    if (question.kind === QuestionKind.OPTIONS && typeof question.answer === 'string') {
      input.options[customOption] = true
    }
  }

  function validateAnswer (question: AnsweredQuestion, input: InputState): void {
    isAnswered = isValidAnswer(question, input)
  }

  function isValidAnswer (question: AnsweredQuestion, input: InputState): boolean {
    if (!question.isMandatory) return true

    switch (question.kind) {
      case QuestionKind.STRING:
        return hasText(input.answer)
      case QuestionKind.OPTION:
        return input.option === customOption ? hasText(input.answer) : input.option !== undefined
      case QuestionKind.OPTIONS:
        return input.options[customOption] ? hasText(input.answer) : input.options.some((on) => on)
      default:
        return false
    }
  }

  function handleChange (patch: Partial<AnsweredQuestion>): void {
    dispatch('change', patch)
  }

  function handleAnswerChange (): void {
    const patch = extractCurrentAnswerSet(input)
    handleChange(patch)
  }

  interface AnswerSet {
    answer?: string
    answers?: number[]
  }

  function isSameAnswers (a1: AnswerSet, a2: AnswerSet): boolean {
    return (a1.answer ?? null) === (a2.answer ?? null) && deepEqual(a1.answers ?? null, a2.answers ?? null)
  }

  function extractCurrentAnswerSet (input: InputState): AnswerSet {
    switch (question.kind) {
      case QuestionKind.STRING: {
        const answer = hasText(input.answer) ? input.answer : undefined
        return { answer, answers: undefined }
      }
      case QuestionKind.OPTION: {
        const answer: string | undefined = input.option === customOption ? input.answer : undefined
        const answers: number[] | undefined =
          input.option !== undefined && input.option !== customOption ? [input.option] : undefined
        return { answer, answers }
      }
      case QuestionKind.OPTIONS: {
        const toggledOptions: number[] = input.options
          .map((state, idx) => [state, idx] as const)
          .filter((a) => a[0])
          .map((a) => a[1])

        const answers = toggledOptions.length > 0 ? toggledOptions : undefined
        const answer = input.options[customOption] ? input.answer : undefined
        return { answer, answers }
      }
    }
  }

  function getReadonlyAnswers (): string[] {
    switch (question.kind) {
      case QuestionKind.STRING:
        return [input.answer.trim()]
      case QuestionKind.OPTION:
        if (input.option === undefined) {
          return []
        }
        if (input.option === customOption) {
          return [input.answer.trim()]
        }
        return [question.options?.[input.option] ?? '']
      case QuestionKind.OPTIONS: {
        const answers: string[] = (question.options ?? []).filter((_, idx) => input.options[idx])
        if (input.options[customOption]) {
          answers.push(input.answer.trim())
        }
        return answers
      }
      default:
        return []
    }
  }
</script>

<svelte:window on:beforeunload={flush} />
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
          bind:group={input.option}
          on:change={handleAnswerChange}
        />
      {/each}
      {#if question.hasCustomOption}
        <ModernRadioButton
          id={`${id}-custom`}
          value={customOption}
          labelIntl={survey.string.AnswerCustomOption}
          bind:group={input.option}
          on:change={handleAnswerChange}
        />
        {#if input.option === customOption}
          <div class="pl-6">
            <EditBox
              bind:value={input.answer}
              placeholder={survey.string.AnswerPlaceholder}
              focusable
              autoFocus
              on:change={handleAnswerChange}
            />
          </div>
        {/if}
      {/if}
    </div>
  {:else if question.kind === QuestionKind.OPTIONS}
    <div class="flex-col flex-gap-2 px-6">
      {#each question.options ?? [] as option, i}
        <ModernCheckbox
          id={`${id}-${i}`}
          label={option}
          bind:checked={input.options[i]}
          on:change={handleAnswerChange}
        />
      {/each}
      {#if question.hasCustomOption}
        <ModernCheckbox
          id={`${id}-custom`}
          labelIntl={survey.string.AnswerCustomOption}
          bind:checked={input.options[customOption]}
          on:change={handleAnswerChange}
        />
        {#if input.options[customOption]}
          <div class="pl-6">
            <EditBox
              bind:value={input.answer}
              placeholder={survey.string.AnswerPlaceholder}
              focusable
              autoFocus
              on:change={handleAnswerChange}
            />
          </div>
        {/if}
      {/if}
    </div>
  {:else}
    <div>
      <EditBox
        format={'text-multiline'}
        bind:value={input.answer}
        placeholder={survey.string.AnswerPlaceholder}
        on:change={handleAnswerChange}
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
