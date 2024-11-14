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
  import { EditBox, ModernCheckbox, ModernRadioButton } from '@hcengineering/ui'
  import { Question, QuestionKind } from '@hcengineering/survey'
  import survey from '../plugin'

  export let question: Question

  $: id = generateId()

  let answer = ''
  let selectedOption: number
  const selectedOptions: Record<number, boolean> = {}
  const customOption = -1

  export function getAnswer (): string[] {
    const answers = []
    if (question.kind === QuestionKind.STRING) {
      if (answer.trim().length > 0) {
        answers.push(answer)
      }
    } else if (question.kind === QuestionKind.OPTION) {
      if (question.options !== undefined && selectedOption !== undefined) {
        if (selectedOption === customOption) {
          answers.push(answer)
        } else {
          answers.push(question.options[selectedOption])
        }
      }
    } else if (question.kind === QuestionKind.OPTIONS) {
      if (question.options !== undefined) {
        for (let i = 0; i < question.options.length; i++) {
          if (selectedOptions[i]) {
            answers.push(question.options[i])
          }
        }
      }
      if (selectedOptions[customOption]) {
        answers.push(answer)
      }
    }
    return answers
  }
</script>

<div class="question-answer-container flex-col flex-gap-3">
  <div class="text-lg caption-color font-medium flex-no-shrink">{question.name}</div>
  {#if question.kind === QuestionKind.OPTION}
    <div class="flex-col flex-gap-2 px-6">
      {#each question.options ?? [] as option, i}
        <ModernRadioButton id={`${id}-${i}`} value={i} label={option} bind:group={selectedOption} />
      {/each}
      {#if question.hasCustomOption}
        <ModernRadioButton
          id={`${id}-custom`}
          value={customOption}
          labelIntl={survey.string.AnswerCustomOption}
          bind:group={selectedOption}
        />
        {#if selectedOption === customOption}
          <div class="pl-6">
            <EditBox
              kind={'ghost-large'}
              autoFocus
              bind:value={answer}
              placeholder={survey.string.AnswerPlaceholder}
              focusable
            />
          </div>
        {/if}
      {/if}
    </div>
  {:else if question.kind === QuestionKind.OPTIONS}
    <div class="flex-col flex-gap-2 px-6">
      {#each question.options ?? [] as option, i}
        <ModernCheckbox id={`${id}-${i}`} label={option} bind:checked={selectedOptions[i]} />
      {/each}
      {#if question.hasCustomOption}
        <ModernCheckbox
          id={`${id}-custom`}
          labelIntl={survey.string.AnswerCustomOption}
          bind:checked={selectedOptions[customOption]}
        />
        {#if selectedOptions[customOption]}
          <div class="pl-6">
            <EditBox
              kind={'ghost-large'}
              autoFocus
              bind:value={answer}
              placeholder={survey.string.AnswerPlaceholder}
              focusable
            />
          </div>
        {/if}
      {/if}
    </div>
  {:else}
    <EditBox kind={'ghost-large'} bind:value={answer} placeholder={survey.string.AnswerPlaceholder} focusable />
  {/if}
</div>

<style lang="scss">
  :global(.question-answer-container + .question-answer-container) {
    padding-top: var(--spacing-1_5);
    border-top: 1px solid var(--theme-divider-color);
  }
</style>
