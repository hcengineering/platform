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
  import {
    type Answer,
    type QuestionOption,
    type QuestionTypePlayerComponentProps,
    type SingleChoiceAnswerData,
    type SingleChoiceQuestion
  } from '@hcengineering/survey'
  import { EditBox, RadioButton } from '@hcengineering/ui'

  /**
   * Declared $$Props help TypeScript ensure that your component properly implements {@link QuestionTypeEditorComponentType}
   * @see https://raqueebuddinaziz.com/blog/svelte-type-events-slots-and-props/#restprops-props
   */
  interface $$Props extends QuestionTypePlayerComponentProps<SingleChoiceQuestion, SingleChoiceAnswerData> {}

  export let question: SingleChoiceQuestion
  export let answer: Answer<SingleChoiceQuestion, SingleChoiceAnswerData>
  export let editable = true
  export let submit: (data: Partial<Answer<SingleChoiceQuestion, SingleChoiceAnswerData>>) => Promise<void>

  let probablyShuffledOptions: Array<QuestionOption & { originalIndex: number }> = []
  $: {
    probablyShuffledOptions = question.options.map((option, index) => ({ ...option, originalIndex: index }))
    if (question.shuffle) {
      probablyShuffledOptions = probablyShuffledOptions.toSorted(() => Math.random() - 0.5)
    }
  }

  async function selectIndex (originalIndex: number): Promise<void> {
    await submit({
      answer: {
        ...answer.answer,
        selection: originalIndex
      }
    })
  }
</script>

<div>
  {#each probablyShuffledOptions as option (option.originalIndex)}
    <div class="flex flex-row-center flex-stretch flex-gap-1 my-1">
      <div class="flex min-w-8 pl-2">
        <RadioButton
          group={answer.answer.selection}
          value={option.originalIndex}
          labelOverflow
          disabled={!editable}
          action={() => selectIndex(option.originalIndex)}
        />
      </div>
      <EditBox kind="default" fullSize value={option.label} disabled={true} />
    </div>
  {/each}
</div>
