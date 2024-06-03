<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import {
    type QuestionDataEditorProps,
    type QuestionDataEditorPropsSubmit,
    type QuestionDataPresenterProps,
    type QuestionOption,
    type SingleChoiceAssessment,
    type SingleChoiceAssessmentData,
    type SingleChoiceQuestion,
    type SingleChoiceQuestionData
  } from '@hcengineering/questions'
  import { moveItem } from '../utils'
  import LabelEditor from './LabelEditor.svelte'
  import OptionsList, { type OptionsListDropEvent } from './OptionsList.svelte'
  import RadioButton from './RadioButton.svelte'

  // // TODO: Move to `generics` attribute when IDE supports it
  // //  https://youtrack.jetbrains.com/issue/WEB-57377
  type Q = SingleChoiceQuestion | SingleChoiceAssessment

  /**
   * Declared $$Props help TypeScript ensure that your component properly implements interface
   * @see https://raqueebuddinaziz.com/blog/svelte-type-events-slots-and-props/#restprops-props
   */
  type $$Props = QuestionDataPresenterProps<Q> | QuestionDataEditorProps<Q>

  export let questionData: SingleChoiceQuestionData
  export let assessmentData: SingleChoiceAssessmentData | null = null
  export let submit: QuestionDataEditorPropsSubmit<Q> | undefined = undefined

  const inputs: LabelEditor[] = []
  let draftInput: LabelEditor | undefined = undefined

  let draft: string = ''

  function onOptionLabelKeyDown (event: KeyboardEvent, index: number): void {
    if (submit === undefined) {
      return
    }
    switch (event.key) {
      case 'ArrowUp': {
        event.preventDefault()
        const prevInput = inputs[index < 0 ? inputs.length - 1 : index - 1]
        prevInput?.focus()
        break
      }
      case 'ArrowDown':
      case 'Enter': {
        event.preventDefault()
        if (index < 0) {
          return
        }
        const nextInput = index === inputs.length - 1 ? draftInput : inputs[index + 1]
        nextInput?.focus()
        break
      }
    }
  }

  function onOptionLabelChange (index: number): void {
    if (submit === undefined) {
      return
    }
    const label = questionData.options[index].label
    if (label === '') {
      removeOptionAt(index)
    } else {
      void submit({ questionData })
    }
  }

  function appendOption (): void {
    if (submit === undefined) {
      return
    }
    questionData.options = [...questionData.options, { label: draft }]
    void submit({ questionData })
    setTimeout(() => {
      inputs[questionData.options.length - 1].focus()
      draft = ''
    })
  }

  function removeOptionAt (index: number): void {
    if (submit === undefined) {
      return
    }
    if (questionData.options.length < 2) {
      return
    }
    questionData.options = [...questionData.options.slice(0, index), ...questionData.options.slice(index + 1)] as [
      QuestionOption,
      ...QuestionOption[]
    ]
    if (assessmentData !== null) {
      if (assessmentData.correctIndex > index) {
        assessmentData.correctIndex -= 1
      } else if (assessmentData.correctIndex === index) {
        assessmentData.correctIndex = 0
      }
      void submit({ questionData, assessmentData })
    } else {
      void submit({ questionData })
    }
    setTimeout(() => {
      inputs[index > 0 ? index - 1 : 0].focus()
      draft = ''
    })
  }

  function toggleIndex (index: number): void {
    if (submit === undefined || assessmentData === null) {
      return
    }
    assessmentData.correctIndex = index
    void submit({ assessmentData })
  }

  let canDrag: boolean = false
  $: canDrag = submit !== undefined && questionData.options.length > 1

  function onDrop (event: OptionsListDropEvent): void {
    const { from, to } = event.detail
    if (submit === undefined || from === to) {
      return
    }
    const correctOption = assessmentData === null ? null : questionData.options[assessmentData.correctIndex]

    questionData.options = moveItem(questionData.options, from, to)

    if (assessmentData === null) {
      void submit({ questionData })
    } else {
      assessmentData.correctIndex = questionData.options.findIndex((option) => option === correctOption)
      void submit({ questionData, assessmentData })
    }
  }

  export function focus (): void {
    if (submit !== undefined) {
      inputs[0].focus()
    }
  }
</script>

<OptionsList
  items={questionData.options}
  append={questionData.options.length > 1 || questionData.options[0].label.length > 0}
  showDrag
  showBullet
  {canDrag}
  on:drop={onDrop}
>
  <svelte:fragment slot="append-bullet">
    <RadioButton group={null} value={-1} label="" disabled />
  </svelte:fragment>

  <svelte:fragment slot="bullet" let:index>
    {#if assessmentData !== null}
      <RadioButton
        group={assessmentData.correctIndex}
        value={index}
        labelOverflow
        disabled={submit === undefined}
        action={() => {
          toggleIndex(index)
        }}
      />
    {:else}
      <RadioButton group={null} value={index} disabled labelOverflow />
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="append-label">
    <LabelEditor
      bind:this={draftInput}
      bind:value={draft}
      on:input={appendOption}
      on:keydown={(event) => {
        onOptionLabelKeyDown(event, -1)
      }}
    />
  </svelte:fragment>

  <svelte:fragment slot="label" let:index>
    <LabelEditor
      bind:this={inputs[index]}
      bind:value={questionData.options[index].label}
      readonly={submit === undefined}
      on:keydown={(event) => {
        onOptionLabelKeyDown(event, index)
      }}
      on:change={() => {
        onOptionLabelChange(index)
      }}
    />
  </svelte:fragment>
</OptionsList>
