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
  import { Answer, Question, QuestionType } from '@hcengineering/survey'
  import { getClient } from '@hcengineering/presentation'
  import { Class } from '@hcengineering/core'
  import { ComponentType } from 'svelte'
  import survey from '../plugin'
  import { getResource } from '@hcengineering/platform'
  import { CheckBox, Label, Loading } from '@hcengineering/ui'
  import { StyledTextBox } from '@hcengineering/text-editor'

  // TODO: Move to `generics` attribute when IDE supports it
  //  https://youtrack.jetbrains.com/issue/WEB-57377
  type Q = Question
  type A = Answer<Q>

  export let index: number = 0
  export let question: Q
  export let answer: A

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let questionClass: Class<Q>
  let questionType: QuestionType<Q>
  let questionPlayerComponentPromise: Promise<ComponentType>
  $: if (question._class !== questionClass?._id) {
    questionClass = hierarchy.getClass<Q>(question._class)
    questionType = hierarchy.as(questionClass, survey.mixin.QuestionType)
    questionPlayerComponentPromise = getResource(questionType.player)
  }

  let isSubmitting = false

  async function submit (data: Partial<A>): Promise<void> {
    isSubmitting = true
    await client.updateCollection(
      answer._class,
      answer.space,
      answer._id,
      answer.attachedTo,
      answer.attachedToClass,
      answer.collection,
      data
    )
    isSubmitting = false
  }
</script>

<form class="root-editor pt-1 pb-6 pr-2 mb-6 bottom-divider">
  <div class="flex flex-row-center">
    <div class="flex-grow content-color">
      {index + 1}. <Label label={questionClass.label} />
    </div>
    {#if isSubmitting}
      <Loading size="inline" shrink />
    {/if}
  </div>
  <div class="flex items-baseline justify-end flex-wrap mt-2 mb-2">
    <div class="flex-grow text-lg">
      <StyledTextBox mode={1} hideExtraButtons isScrollable={false} showButtons={false} content={question.title} />
    </div>
    <div class="flex-row-center mr-2 flex-gap-2 flex-no-shrink">
      <CheckBox readonly kind="positive" size="medium" circle checked={question.assessment !== null} />
      <Label label={survey.string.Assessment} />
    </div>
  </div>
  {#await questionPlayerComponentPromise}
    <Loading />
  {:then instance}
    <svelte:component this={instance} editable={true} {question} {answer} {submit} />
  {/await}
</form>
