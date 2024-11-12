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
  import { EditBox, Label } from '@hcengineering/ui'
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

<div class="antiSection">
  <div class="antiSection-header">
    <span class="antiSection-header__title">
      {question.name}
    </span>
  </div>
  {#if question.kind === QuestionKind.OPTION}
    {#each question.options ?? [] as option, i}
      <div class="option">
        <input type="radio" id={`${id}-${i}`} value={i} bind:group={selectedOption} />
        <label class="option__label" for={`${id}-${i}`}>
          {option}
        </label>
      </div>
    {/each}
    {#if question.hasCustomOption}
      <div class="option">
        <input id="custom" type="radio" value={customOption} bind:group={selectedOption} />
        <label class="option__label" for="custom">
          <Label label={survey.string.AnswerCustomOption} />
        </label>
        {#if selectedOption === customOption}
          <div class="option__custom">
            <EditBox bind:value={answer} placeholder={survey.string.AnswerPlaceholder} />
          </div>
        {/if}
      </div>
    {/if}
  {:else if question.kind === QuestionKind.OPTIONS}
    {#each question.options ?? [] as option, i}
      <div class="option">
        <input id={`${id}-${i}`} type="checkbox" bind:checked={selectedOptions[i]} />
        <label class="option__label" for={`${id}-${i}`}>
          {option}
        </label>
      </div>
    {/each}
    {#if question.hasCustomOption}
      <div class="option">
        <input id="custom" type="checkbox" bind:checked={selectedOptions[customOption]} />
        <label class="option__label" for="custom">
          <Label label={survey.string.AnswerCustomOption} />
        </label>
        {#if selectedOptions[customOption]}
          <div class="option__custom">
            <EditBox bind:value={answer} placeholder={survey.string.AnswerPlaceholder} />
          </div>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="option">
      <EditBox bind:value={answer} placeholder={survey.string.AnswerPlaceholder} />
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
</style>
