<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type {
    AnswerDataEditorProps,
    AnswerDataPresenterProps,
    MultipleChoiceAnswerData,
    MultipleChoiceAssessment,
    MultipleChoiceAssessmentAnswer,
    MultipleChoiceAssessmentData,
    MultipleChoiceQuestion,
    MultipleChoiceQuestionAnswer,
    MultipleChoiceQuestionData
  } from '@hcengineering/questions'
  import { CheckBox } from '@hcengineering/ui'
  import LabelEditor from './LabelEditor.svelte'
  import OptionsList from './OptionsList.svelte'

  /**
   * Declared $$Props help TypeScript ensure that your component properly implements interface
   * @see https://raqueebuddinaziz.com/blog/svelte-type-events-slots-and-props/#restprops-props
   */
  type $$Props =
    | AnswerDataEditorProps<MultipleChoiceQuestion, MultipleChoiceQuestionAnswer>
    | AnswerDataPresenterProps<MultipleChoiceQuestion, MultipleChoiceQuestionAnswer>
    | AnswerDataEditorProps<MultipleChoiceAssessment, MultipleChoiceAssessmentAnswer>
    | AnswerDataPresenterProps<MultipleChoiceAssessment, MultipleChoiceAssessmentAnswer>

  export let questionData: MultipleChoiceQuestionData
  export let assessmentData: MultipleChoiceAssessmentData | null = null
  export let answerData: MultipleChoiceAnswerData | null = null
  export let submit: ((answerData: MultipleChoiceAnswerData) => Promise<void>) | null = null
  export let showDiff: boolean = false

  async function toggleIndex (index: number, on: boolean): Promise<void> {
    if (submit === null) {
      return
    }
    let selectedIndices = answerData?.selectedIndices ?? []
    if (on) {
      selectedIndices = [...selectedIndices, index]
    } else {
      selectedIndices = selectedIndices.filter((it) => it !== index)
    }
    await submit({ selectedIndices })
  }
</script>

<OptionsList items={questionData.options} showBullet showCorrect={assessmentData !== null && showDiff}>
  <svelte:fragment slot="bullet" let:index>
    {#if assessmentData !== null && showDiff}
      <CheckBox
        size="medium"
        checked={answerData?.selectedIndices.includes(index)}
        kind={answerData?.selectedIndices.includes(index) && !assessmentData.correctIndices.includes(index)
          ? 'negative'
          : 'default'}
        readonly
      />
    {:else}
      <CheckBox
        size="medium"
        checked={answerData?.selectedIndices.includes(index)}
        readonly={submit === null}
        on:value={(event) => toggleIndex(index, event.detail)}
      />
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="correct" let:index>
    {#if assessmentData !== null && showDiff}
      <CheckBox
        size="medium"
        checked={assessmentData.correctIndices.includes(index)}
        kind={assessmentData.correctIndices.includes(index) ? 'positive' : 'default'}
        readonly
      />
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="label" let:index>
    <LabelEditor value={questionData.options[index].label} readonly />
  </svelte:fragment>
</OptionsList>
