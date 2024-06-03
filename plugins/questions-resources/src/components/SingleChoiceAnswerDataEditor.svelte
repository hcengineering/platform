<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type {
    AnswerDataEditorProps,
    AnswerDataPresenterProps,
    SingleChoiceAnswerData,
    SingleChoiceAssessment,
    SingleChoiceAssessmentAnswer,
    SingleChoiceAssessmentData,
    SingleChoiceQuestion,
    SingleChoiceQuestionAnswer,
    SingleChoiceQuestionData
  } from '@hcengineering/questions'
  import LabelEditor from './LabelEditor.svelte'
  import OptionsList from './OptionsList.svelte'
  import RadioButton from './RadioButton.svelte'

  /**
   * Declared $$Props help TypeScript ensure that your component properly implements interface
   * @see https://raqueebuddinaziz.com/blog/svelte-type-events-slots-and-props/#restprops-props
   */
  type $$Props =
    | AnswerDataEditorProps<SingleChoiceQuestion, SingleChoiceQuestionAnswer>
    | AnswerDataPresenterProps<SingleChoiceQuestion, SingleChoiceQuestionAnswer>
    | AnswerDataEditorProps<SingleChoiceAssessment, SingleChoiceAssessmentAnswer>
    | AnswerDataPresenterProps<SingleChoiceAssessment, SingleChoiceAssessmentAnswer>

  export let questionData: SingleChoiceQuestionData
  export let assessmentData: SingleChoiceAssessmentData | null = null
  export let answerData: SingleChoiceAnswerData | null = null
  export let submit: ((answerData: SingleChoiceAnswerData) => Promise<void>) | null = null
  export let showDiff: boolean = false

  async function toggleIndex (selectedIndex: number): Promise<void> {
    if (submit === null) {
      return
    }
    await submit({ selectedIndex })
  }
</script>

<OptionsList items={questionData.options} showBullet showCorrect={assessmentData !== null && showDiff}>
  <svelte:fragment slot="bullet" let:index>
    {#if assessmentData !== null && showDiff}
      <RadioButton
        kind={answerData?.selectedIndex === index && assessmentData?.correctIndex !== index ? 'negative' : 'default'}
        group={answerData?.selectedIndex}
        value={index}
        labelOverflow
        disabled
      />
    {:else}
      <RadioButton
        group={answerData?.selectedIndex}
        value={index}
        labelOverflow
        disabled={submit === null}
        action={async () => {
          await toggleIndex(index)
        }}
      />
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="correct" let:index>
    {#if assessmentData !== null && showDiff}
      <RadioButton
        kind={assessmentData?.correctIndex === index ? 'positive' : 'default'}
        group={assessmentData?.correctIndex}
        value={index}
        labelOverflow
        disabled
      />
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="label" let:index>
    <LabelEditor value={questionData.options[index].label} readonly />
  </svelte:fragment>
</OptionsList>
