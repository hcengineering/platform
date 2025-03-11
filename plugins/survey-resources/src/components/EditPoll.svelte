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
  import { Poll, PollData, Question, QuestionKind } from '@hcengineering/survey'
  import { createEventDispatcher } from 'svelte'
  import { hasText } from '../utils'
  import PollQuestion from './PollQuestion.svelte'

  const dispatch = createEventDispatcher()

  export let object: Poll | PollData
  export let canSubmit: boolean = false
  export let readonly: boolean = false

  const questionNodes: PollQuestion[] = []
  const isAnswered: boolean[] = []

  $: updateCanSubmit(isAnswered)

  function updateCanSubmit (isAnswered: boolean[]): void {
    canSubmit = isAnswered.every((yes) => yes)
  }

  function isQuestionValid (question: Question): boolean {
    if (!hasText(question.name)) {
      return false
    }
    if (question.kind === QuestionKind.OPTION || question.kind === QuestionKind.OPTIONS) {
      if (question.options === undefined || question.options === null || question.options.length === 0) {
        return false
      }
    }
    return true
  }

  function handleChange (patch: Partial<Poll>): void {
    dispatch('change', patch)
  }

  function handleQuestionChange (index: number, patch: Partial<PollQuestion>): Promise<void> | void {
    const questions = (object.questions ?? []).slice()
    questions[index] = { ...questions[index], ...patch }
    handleChange({ questions })
  }
</script>

<div class="antiSection flex-gap-4 poll mb-8">
  {#if hasText(object.prompt)}
    <div class="antiSection-header">
      <span class="antiSection-header__title">
        {object.prompt}
      </span>
    </div>
  {/if}
  {#each object.questions ?? [] as question, index (index)}
    {#if isQuestionValid(question)}
      <PollQuestion
        bind:this={questionNodes[index]}
        bind:isAnswered={isAnswered[index]}
        {readonly}
        on:change={(e) => handleQuestionChange(index, e.detail)}
        {question}
      />
    {/if}
  {/each}
</div>

<style>
  .poll {
    user-select: text;
  }
</style>
