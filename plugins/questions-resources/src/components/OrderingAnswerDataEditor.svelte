<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import {
    type AnswerDataEditorProps,
    type AnswerDataPresenterProps,
    type OrderingAnswerData,
    type OrderingAssessment,
    type OrderingAssessmentAnswer,
    type OrderingAssessmentData,
    type OrderingPosition,
    type OrderingQuestion,
    type OrderingQuestionAnswer,
    type OrderingQuestionData
  } from '@hcengineering/questions'
  import { Loading } from '@hcengineering/ui'
  import { moveItem } from '../utils'
  import LabelEditor from './LabelEditor.svelte'
  import OptionsList, { type OptionsListDropEvent } from './OptionsList.svelte'

  /**
   * Declared $$Props help TypeScript ensure that your component properly implements interface
   * @see https://raqueebuddinaziz.com/blog/svelte-type-events-slots-and-props/#restprops-props
   */
  type $$Props =
    | AnswerDataEditorProps<OrderingQuestion, OrderingQuestionAnswer>
    | AnswerDataPresenterProps<OrderingQuestion, OrderingQuestionAnswer>
    | AnswerDataEditorProps<OrderingAssessment, OrderingAssessmentAnswer>
    | AnswerDataPresenterProps<OrderingAssessment, OrderingAssessmentAnswer>

  export let questionData: OrderingQuestionData
  export let assessmentData: OrderingAssessmentData | null = null
  export let answerData: OrderingAnswerData | null = null
  export let submit: ((answerData: OrderingAnswerData) => Promise<void>) | null = null
  export let showDiff: boolean = false

  $: if (answerData === null && submit !== null) {
    const order = questionData.options.map((_, index) => index + 1) as [OrderingPosition, ...OrderingPosition[]]
    submit({ order })
  }

  let indices = questionData.options.map((_, index) => index) as [number, ...number[]]
  $: if (showDiff && assessmentData !== null) {
    indices = assessmentData.correctOrder
      .map((position, index) => [position, index])
      .sort(([aPosition], [bPosition]) => (aPosition > bPosition ? 1 : aPosition < bPosition ? -1 : 0))
      .map(([_, index]) => index) as [number, ...number[]]
  } else if (answerData !== null) {
    indices = answerData.order
      .map((position, index) => [position, index])
      .sort(([aPosition], [bPosition]) => (aPosition > bPosition ? 1 : aPosition < bPosition ? -1 : 0))
      .map(([_, index]) => index) as [number, ...number[]]
  } else {
    indices = questionData.options.map((_, index) => index) as [number, ...number[]]
  }

  let canDrag: boolean = false
  $: canDrag = submit !== null && answerData !== null && questionData.options.length > 1

  function onDrop (event: OptionsListDropEvent): void {
    if (submit === null) {
      return
    }
    const { from, to } = event.detail
    indices = moveItem(indices, from, to)
    const order = indices
      .map((initialIndex, index) => [initialIndex, index])
      .sort(([aInitialIndex], [bInitialIndex]) =>
        aInitialIndex > bInitialIndex ? 1 : aInitialIndex < bInitialIndex ? -1 : 0
      )
      .map(([_, index]) => index + 1) as [OrderingPosition, ...OrderingPosition[]]
    submit({ order })
  }
</script>

{#if answerData === null}
  <Loading />
{:else}
  <OptionsList
    items={indices}
    showDrag={canDrag}
    showBullet={assessmentData !== null && showDiff}
    showCorrect={assessmentData !== null && showDiff}
    {canDrag}
    on:drop={onDrop}
  >
    <svelte:fragment slot="bullet" let:item>
      {#if assessmentData !== null && showDiff}
        <span class:negative={answerData.order[item] !== assessmentData.correctOrder[item]}>
          {answerData.order[item]}
        </span>
      {:else}
        •
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="correct" let:item>
      {#if assessmentData !== null && showDiff}
        <span class="positive">
          {assessmentData.correctOrder[item]}
        </span>
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="label" let:item>
      <LabelEditor value={questionData.options[item].label} readonly />
    </svelte:fragment>
  </OptionsList>
{/if}

<style lang="scss">
  .negative {
    color: var(--negative-button-default);
  }
  .positive {
    color: var(--positive-button-default);
  }
</style>
