<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import {
    type QuestionDataEditorProps,
    type QuestionDataEditorPropsSubmit,
    type QuestionDataPresenterProps,
    type QuestionOption,
    type OrderingAssessment,
    type OrderingAssessmentData,
    type OrderingQuestion,
    type OrderingQuestionData,
    type OrderingPosition
  } from '@hcengineering/questions'
  import {
    Button,
    DropdownLabelsPopup,
    type DropdownTextItem,
    type PopupPositionElement,
    showPopup
  } from '@hcengineering/ui'
  import { moveItem } from '../utils'
  import LabelEditor from './LabelEditor.svelte'
  import OptionsList, { type OptionsListDropEvent } from './OptionsList.svelte'

  // TODO: Move to `generics` attribute when IDE supports it
  // https://youtrack.jetbrains.com/issue/WEB-57377
  type Q = OrderingQuestion | OrderingAssessment

  /**
   * Declared $$Props help TypeScript ensure that your component properly implements interface
   * @see https://raqueebuddinaziz.com/blog/svelte-type-events-slots-and-props/#restprops-props
   */
  type $$Props = QuestionDataPresenterProps<Q> | QuestionDataEditorProps<Q>

  export let questionData: OrderingQuestionData
  export let assessmentData: OrderingAssessmentData | null = null
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
    if (assessmentData !== null) {
      assessmentData.correctOrder = [...assessmentData.correctOrder, questionData.options.length]
      void submit({ questionData, assessmentData })
    } else {
      void submit({ questionData })
    }
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
    if (assessmentData === null) {
      questionData.options = [...questionData.options.slice(0, index), ...questionData.options.slice(index + 1)] as [
        QuestionOption,
        ...QuestionOption[]
      ]
      void submit({ questionData })
    } else {
      const removedPosition = assessmentData.correctOrder[index]
      questionData.options = [...questionData.options.slice(0, index), ...questionData.options.slice(index + 1)] as [
        QuestionOption,
        ...QuestionOption[]
      ]
      assessmentData.correctOrder = [
        ...assessmentData.correctOrder.slice(0, index),
        ...assessmentData.correctOrder.slice(index + 1)
      ].map((position) => (position >= removedPosition ? position - 1 : position)) as [
        OrderingPosition,
        ...OrderingPosition[]
      ]
      void submit({ questionData, assessmentData })
    }
    setTimeout(() => {
      inputs[index > 0 ? index - 1 : 0].focus()
      draft = ''
    })
  }

  let positionDropdownItems: DropdownTextItem[] = [{ id: '1', label: '1' }]
  $: positionDropdownItems = questionData.options.map((_, i) => ({ id: String(i + 1), label: String(i + 1) }))

  function changePosition (event: MouseEvent, index: number): void {
    if (submit === undefined || assessmentData === null) {
      return
    }

    const prevPosition = assessmentData.correctOrder[index]

    showPopup(
      DropdownLabelsPopup,
      {
        items: positionDropdownItems,
        selected: String(prevPosition),
        enableSearch: questionData.options.length > 7
      },
      (event.target ?? undefined) as PopupPositionElement | undefined,
      (result) => {
        if (result === undefined || assessmentData === null || submit === undefined) {
          return
        }
        const position = parseFloat(result)
        if (position === prevPosition) {
          return
        }

        assessmentData.correctOrder = assessmentData.correctOrder.map((p, i) => {
          if (i === index) {
            return position
          } else if (p === position) {
            return prevPosition
          } else {
            return p
          }
        }) as [OrderingPosition, ...OrderingPosition[]]

        void submit({ assessmentData })
      }
    )
  }

  let canDrag: boolean = false
  $: canDrag = submit !== undefined && questionData.options.length > 1

  function onDrop (event: OptionsListDropEvent): void {
    const { from, to } = event.detail
    if (submit === undefined || from === to) {
      return
    }

    questionData.options = moveItem(questionData.options, from, to)
    if (assessmentData === null) {
      void submit({ questionData })
    } else {
      assessmentData.correctOrder = moveItem(assessmentData.correctOrder, from, to)
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
  <svelte:fragment slot="append-bullet">•</svelte:fragment>

  <svelte:fragment slot="bullet" let:index>
    {#if assessmentData !== null}
      <Button
        size="inline"
        padding="0 0"
        disabled={submit === undefined}
        on:click={(event) => {
          changePosition(event, index)
        }}
      >
        <span slot="content">
          {assessmentData.correctOrder[index]}
        </span>
      </Button>
    {:else}
      •
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
