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
  import { Class, Doc, Ref, Space } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { FocusHandler, Label, createFocusManager, Modal } from '@hcengineering/ui'
  import { Question, QuestionKind, Survey } from '@hcengineering/survey'
  import { createEventDispatcher, onMount } from 'svelte'
  import SurveyFormQuestion from './SurveyFormQuestion.svelte'
  import survey from '../plugin'
  import { hasText } from '../utils'

  const dispatch = createEventDispatcher()
  const manager = createFocusManager()

  export let source: Survey
  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>

  const questionNodes: SurveyFormQuestion[] = []

  function isQuestionValid (question: Question): boolean {
    if (!hasText(question.name)) {
      return false
    }
    if (question.kind === QuestionKind.OPTION || question.kind === QuestionKind.OPTIONS) {
      if (question.options === undefined || question.options.length === 0) {
        return false
      }
    }
    return true
  }

  function isPreview (): boolean {
    return objectId === undefined || space === undefined || _class === undefined
  }

  function canSave (): boolean {
    return source.questions !== undefined && source.questions.length > 0
    // TODO: validate answers
  }

  async function saveAnswers (): Promise<void> {
    if (!isPreview() && canSave()) {
      await getClient().addCollection(survey.class.Poll, space, objectId, _class, 'polls', {
        survey: source._id,
        name: source.name,
        prompt: source.prompt,
        results: (source.questions ?? []).map((q, i) => {
          let answer: string[] = []
          const node = questionNodes[i]
          if (node !== undefined) {
            answer = node.getAnswer()
          }
          return {
            question: q.name,
            answer
          }
        })
      })
    }
    dispatch('close')
  }

  onMount(() => {
    dispatch('open', {})
  })
</script>

<FocusHandler {manager} />

<Modal
  type={'type-popup'}
  canSave={isPreview() || canSave()}
  okLabel={isPreview() ? survey.string.Close : survey.string.SurveySubmit}
  okAction={saveAnswers}
  showCancelButton={false}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="title">
    {#if hasText(source.name)}
      {source.name}
    {:else}
      <Label label={survey.string.NoName} />
    {/if}
  </svelte:fragment>

  <div class="antiSection flex-gap-3">
    {#if hasText(source.prompt)}
      <div class="antiSection-header">
        <span class="antiSection-header__title">
          {source.prompt}
        </span>
      </div>
    {/if}
    {#each source.questions ?? [] as question, index}
      {#if isQuestionValid(question)}
        <SurveyFormQuestion bind:this={questionNodes[index]} {question} />
      {/if}
    {/each}
  </div>
</Modal>
