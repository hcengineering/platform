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
  import { Question, QuestionKind } from '@hcengineering/survey'
  import {
    ButtonIcon,
    EditBox,
    Icon,
    IconDelete,
    SelectPopup,
    eventToHTMLElement,
    showPopup,
    tooltip
  } from '@hcengineering/ui'
  import { deepEqual } from 'fast-equals'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import survey from '../plugin'

  const dispatch = createEventDispatcher()

  export let question: Question
  export let readonly: boolean = false
  export let isNewQuestion = false

  let inputNameEditBox: EditBox
  let inputNameSyncState: string = ''
  let inputName: string = ''

  $: if (inputNameSyncState !== question.name) {
    inputNameSyncState = question.name
    inputName = question.name
  }

  let inputOptionsSyncState: string[] = []
  let inputOptions: string[] = []

  let inputNewOption = ''

  $: if (!deepEqual(inputOptionsSyncState, question.options ?? [])) {
    inputOptionsSyncState = question.options ?? []
    inputOptions = inputOptionsSyncState?.slice() ?? []
  }

  let hovered: boolean = false

  function handleChange (patch: Partial<Question>): void {
    dispatch('change', patch)
  }

  function flush (): void {
    if (isNewQuestion) return

    const patch: Partial<Question> = {}
    let haveChanges = false

    if (inputName !== question.name) {
      patch.name = inputName
      haveChanges = true
    }
    if (!deepEqual(inputOptions, question.options ?? [])) {
      patch.options = inputOptions
      haveChanges = true
    }

    if (haveChanges) handleChange(patch)
  }
  onDestroy(flush)

  $: haveNonEmptyName = inputName.trim().length > 0
  $: if (haveNonEmptyName && isNewQuestion) {
    handleChange({ name: inputName })
  }

  function changeOption (index: number): void {
    if (inputOptions[index]?.trim()?.length === 0) {
      deleteOption(index)
    } else {
      handleChange({ options: inputOptions })
    }
  }

  function addOption (): void {
    if (inputNewOption.trim().length === 0) {
      inputNewOption = ''
      return
    }
    inputOptions = [...inputOptions, inputNewOption]
    inputNewOption = ''
    handleChange({ options: inputOptions })
  }

  function deleteOption (index: number): void {
    inputOptions = inputOptions.filter((val, idx) => idx !== index)
    handleChange({ options: inputOptions })
  }

  function showQuestionParams (ev: MouseEvent): void {
    hovered = true
    showPopup(
      SelectPopup,
      {
        value: [
          {
            id: QuestionKind.STRING,
            label: survey.string.QuestionKindString,
            icon: survey.icon.QuestionKindString,
            isSelected: question.kind === QuestionKind.STRING,
            category: { label: survey.string.Answer }
          },
          {
            id: QuestionKind.OPTION,
            label: survey.string.QuestionKindOption,
            icon: survey.icon.QuestionKindOption,
            isSelected: question.kind === QuestionKind.OPTION,
            category: { label: survey.string.Answer }
          },
          {
            id: QuestionKind.OPTIONS,
            label: survey.string.QuestionKindOptions,
            icon: survey.icon.QuestionKindOptions,
            isSelected: question.kind === QuestionKind.OPTIONS,
            category: { label: survey.string.Answer }
          },
          {
            id: 'mandatory',
            label: survey.string.QuestionIsMandatory,
            icon: survey.icon.QuestionIsMandatory,
            isSelected: question.isMandatory,
            category: { label: survey.string.Settings }
          },
          {
            id: 'custom-option',
            label: survey.string.QuestionHasCustomOption,
            icon: survey.icon.QuestionHasCustomOption,
            isSelected: question.hasCustomOption,
            category: { label: survey.string.Settings }
          },
          {
            id: 'delete',
            label: survey.string.DeleteQuestion,
            icon: IconDelete,
            category: { label: survey.string.Control }
          }
        ]
      },
      eventToHTMLElement(ev),
      async (id) => {
        switch (id) {
          case QuestionKind.STRING: {
            handleChange({ kind: QuestionKind.STRING })
            break
          }
          case QuestionKind.OPTION: {
            handleChange({ kind: QuestionKind.OPTION })
            break
          }
          case QuestionKind.OPTIONS: {
            handleChange({ kind: QuestionKind.OPTIONS })
            break
          }
          case 'mandatory': {
            handleChange({ isMandatory: !question.isMandatory })
            break
          }
          case 'custom-option': {
            handleChange({ hasCustomOption: !question.hasCustomOption })
            break
          }
          case 'delete': {
            dispatch('delete')
            break
          }
          case undefined: {
            break
          }
          default: {
            console.error('Unknown command id', id)
          }
        }
        hovered = false
      }
    )
  }

  function showOptionParams (ev: MouseEvent, index: number): void {
    hovered = true
    showPopup(
      SelectPopup,
      {
        value: [
          {
            id: 'delete',
            label: survey.string.DeleteOption,
            icon: IconDelete
          }
        ]
      },
      eventToHTMLElement(ev),
      async (id) => {
        switch (id) {
          case 'delete': {
            deleteOption(index)
            break
          }
          case undefined: {
            break
          }
          default: {
            console.error('Unknown command id', id)
          }
        }
        hovered = false
      }
    )
  }

  let draggedIndex: number | undefined
  let draggedOverIndex: number | undefined
  const draggableElements: HTMLElement[] = []

  function onOptionDragStart (ev: DragEvent, index: number): void {
    if (readonly || ev.dataTransfer === null) {
      return
    }
    draggedIndex = index
    ev.dataTransfer.effectAllowed = 'move'
    ev.dataTransfer.setDragImage(
      draggableElements[index],
      (ev.target as HTMLElement).offsetWidth / 2,
      (ev.target as HTMLElement).offsetHeight / 2
    )
  }

  function onOptionDragOver (ev: DragEvent, index: number): void {
    if (draggedIndex === undefined || draggedIndex === draggedOverIndex || draggedIndex + 1 === draggedOverIndex) {
      return
    }
    ev.preventDefault()
    draggedOverIndex = index
  }

  function onOptionDragLeave (ev: DragEvent, index: number): void {
    if (draggedIndex === undefined) {
      return
    }
    ev.preventDefault()
    if (draggedOverIndex === index) {
      draggedOverIndex = undefined
    }
  }

  function onOptionDrop (): void {
    if (draggedIndex === undefined || draggedOverIndex === undefined) {
      return
    }
    if (draggedIndex === draggedOverIndex || draggedIndex === draggedOverIndex - 1) {
      return
    }

    const item = inputOptions[draggedIndex]
    const other = inputOptions.filter((_, index) => index !== draggedIndex)
    const index = draggedIndex < draggedOverIndex ? draggedOverIndex - 1 : draggedOverIndex
    inputOptions = [...other.slice(0, index), item, ...other.slice(index)]

    handleChange({ options: inputOptions })
  }

  function onOptionDragEnd (): void {
    draggedIndex = undefined
    draggedOverIndex = undefined
  }

  let isRootDragging = false
  let rootElement: HTMLElement

  function onRootDragStart (ev: DragEvent): void {
    if (readonly || ev.dataTransfer === null) {
      return
    }
    ev.dataTransfer.effectAllowed = 'move'
    ev.dataTransfer.setDragImage(
      rootElement,
      (ev.target as HTMLElement).offsetWidth / 2,
      (ev.target as HTMLElement).offsetHeight / 2
    )
    isRootDragging = true
    dispatch('dragStart')
  }

  function onRootDragEnd (): void {
    isRootDragging = false
    dispatch('dragEnd')
  }

  export function focusQuestion (): void {
    inputNameEditBox.focusInput()
  }

  $: questionIcon = isNewQuestion
    ? survey.icon.Question
    : question.kind === QuestionKind.OPTIONS
      ? survey.icon.QuestionKindOptions
      : question.kind === QuestionKind.OPTION
        ? survey.icon.QuestionKindOption
        : survey.icon.QuestionKindString
</script>

<svelte:window on:beforeunload={flush} />
<div
  bind:this={rootElement}
  class="question-container flex-col flex-gap-2"
  class:is-dragged={isRootDragging}
  class:hovered
>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="flex-row-center flex-gap-3 text-base pr-2" on:click={focusQuestion}>
    {#if isNewQuestion}
      <div class="self-start">
        <ButtonIcon size={'small'} disabled icon={questionIcon} />
      </div>
    {:else}
      <div
        class="self-start"
        role="presentation"
        draggable={!readonly}
        on:dragstart={onRootDragStart}
        on:dragend={onRootDragEnd}
      >
        <ButtonIcon size={'small'} disabled={readonly} icon={questionIcon} on:click={showQuestionParams} />
      </div>
    {/if}
    <EditBox
      bind:this={inputNameEditBox}
      format={'text-multiline'}
      disabled={readonly}
      placeholder={survey.string.QuestionPlaceholderEmpty}
      bind:value={inputName}
      on:change={() => {
        handleChange({ name: inputName })
      }}
    />
    {#if !isNewQuestion}
      {#if question.hasCustomOption && question.kind !== QuestionKind.STRING}
        <div class="flex-no-shrink" use:tooltip={{ label: survey.string.QuestionTooltipCustomOption }}>
          <Icon icon={survey.icon.QuestionHasCustomOption} size={'small'} />
        </div>
      {/if}
      {#if question.isMandatory}
        <div class="flex-no-shrink" use:tooltip={{ label: survey.string.QuestionTooltipMandatory }}>
          <Icon icon={survey.icon.QuestionIsMandatory} size={'small'} />
        </div>
      {/if}
    {/if}
  </div>
  {#if !isNewQuestion && question.kind !== QuestionKind.STRING}
    {#each inputOptions as option, index (index)}
      <div
        class="flex-row-center flex-gap-3 option"
        role="listitem"
        bind:this={draggableElements[index]}
        on:dragover={(ev) => {
          onOptionDragOver(ev, index)
        }}
        on:dragleave={(ev) => {
          onOptionDragLeave(ev, index)
        }}
        on:drop={onOptionDrop}
        class:is-dragged={index === draggedIndex}
        class:dragged-over={draggedIndex !== undefined &&
          draggedOverIndex === index &&
          draggedOverIndex !== draggedIndex &&
          draggedOverIndex !== draggedIndex + 1}
      >
        <div
          role="presentation"
          draggable={!readonly}
          on:dragstart={(ev) => {
            onOptionDragStart(ev, index)
          }}
          on:dragend={onOptionDragEnd}
        >
          <ButtonIcon
            disabled={readonly}
            icon={questionIcon}
            iconSize={'x-small'}
            kind={'tertiary'}
            size={'extra-small'}
            on:click={(ev) => {
              showOptionParams(ev, index)
            }}
          />
        </div>
        <EditBox
          disabled={readonly}
          placeholder={survey.string.QuestionPlaceholderOption}
          bind:value={inputOptions[index]}
          on:change={() => {
            changeOption(index)
          }}
        />
      </div>
    {/each}
    {#if !readonly}
      <div
        class="flex-row-center flex-gap-3 option"
        role="listitem"
        on:dragover={(ev) => {
          onOptionDragOver(ev, question.options?.length ?? 0)
        }}
        on:dragleave={(ev) => {
          onOptionDragLeave(ev, question.options?.length ?? 0)
        }}
        on:drop={onOptionDrop}
        class:dragged-over={draggedOverIndex === inputOptions.length && draggedIndex !== inputOptions.length - 1}
      >
        <ButtonIcon disabled icon={survey.icon.Question} iconSize={'x-small'} kind={'tertiary'} size={'extra-small'} />
        <EditBox
          placeholder={survey.string.QuestionPlaceholderOption}
          bind:value={inputNewOption}
          on:change={addOption}
        />
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .question-container {
    padding: var(--spacing-1);
    border-radius: var(--small-BorderRadius);
    transition: opacity 0.1s ease-in;

    &:hover {
      background-color: var(--theme-popup-color); // var(--global-ui-hover-highlight-BackgroundColor);
    }
    &.hovered,
    &:focus-within {
      background-color: var(--theme-list-row-color);
    }
  }
  .option {
    padding: var(--spacing-0_5) var(--spacing-0_5) var(--spacing-0_5) var(--spacing-5_5);
  }
  .is-dragged {
    opacity: 0.2;
  }
  .dragged-over {
    transition: box-shadow 0.1s ease-in;
    box-shadow: 0 -3px 0 0 var(--primary-button-outline);
  }
</style>
