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
  import { MessageBox, getClient } from '@hcengineering/presentation'
  import { Question, QuestionKind, Survey } from '@hcengineering/survey'
  import { Button, EditBox, IconDelete, SelectPopup, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import survey from '../plugin'

  const client = getClient()
  const dispatch = createEventDispatcher()

  export let parent: Survey
  export let index: number
  export let readonly: boolean = false

  $: question = parent?.questions?.[index] as Question
  $: options = question?.options ?? []
  $: questionIcon =
    question === undefined
      ? undefined
      : question.kind === QuestionKind.OPTIONS
        ? survey.icon.QuestionKindOptions
        : question.kind === QuestionKind.OPTION
          ? survey.icon.QuestionKindOption
          : survey.icon.QuestionKindString

  let newOption = ''
  let newQuestion = ''

  async function updateParent (): Promise<void> {
    await client.updateDoc(parent._class, parent.space, parent._id, { questions: parent.questions })
  }

  async function createQuestion (): Promise<void> {
    if (parent.questions === undefined) {
      parent.questions = []
    }
    parent.questions.push({
      name: newQuestion,
      kind: QuestionKind.STRING,
      isMandatory: false,
      hasCustomOption: false
    })
    await updateParent()
    newQuestion = ''
  }

  async function changeName (): Promise<void> {
    await updateParent()
  }

  async function changeKind (kind: QuestionKind): Promise<void> {
    if (question.kind !== kind) {
      question.kind = kind
      await updateParent()
    }
  }

  async function changeMandatory (): Promise<void> {
    question.isMandatory = !question.isMandatory
    await updateParent()
  }

  async function changeCustomOption (): Promise<void> {
    question.hasCustomOption = !question.hasCustomOption
    await updateParent()
  }

  async function changeOption (index: number): Promise<void> {
    if (options[index].trim().length === 0) {
      await deleteOption(index)
    } else {
      await updateParent()
    }
  }

  async function addOption (): Promise<void> {
    if (newOption.trim().length === 0) {
      newOption = ''
      return
    }
    if (question.options === undefined) {
      question.options = []
    }
    question.options = [...options, newOption]
    await updateParent()
    newOption = ''
  }

  async function deleteOption (index: number): Promise<void> {
    options.splice(index, 1)
    await updateParent()
  }

  async function deleteQuestion (): Promise<void> {
    showPopup(
      MessageBox,
      {
        label: survey.string.DeleteQuestion,
        message: survey.string.DeleteQuestionConfirm
      },
      undefined,
      async (result?: boolean) => {
        if (result === true) {
          parent.questions?.splice(index, 1)
          await updateParent()
        }
      }
    )
  }

  function showQuestionParams (ev: MouseEvent): void {
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
            await changeKind(QuestionKind.STRING)
            break
          }
          case QuestionKind.OPTION: {
            await changeKind(QuestionKind.OPTION)
            break
          }
          case QuestionKind.OPTIONS: {
            await changeKind(QuestionKind.OPTIONS)
            break
          }
          case 'mandatory': {
            await changeMandatory()
            break
          }
          case 'custom-option': {
            await changeCustomOption()
            break
          }
          case 'delete': {
            await deleteQuestion()
            break
          }
          case undefined: {
            break
          }
          default: {
            console.error('Unknown command id', id)
          }
        }
      }
    )
  }

  function showOptionParams (ev: MouseEvent, index: number): void {
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
            await deleteOption(index)
            break
          }
          case undefined: {
            break
          }
          default: {
            console.error('Unknown command id', id)
          }
        }
      }
    )
  }

  let draggedIndex: number | undefined
  let draggedOverIndex: number | undefined
  const draggableElements: HTMLElement[] = []

  function dragStart (ev: DragEvent, index: number): void {
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

  function dragOver (ev: DragEvent, index: number): void {
    if (draggedIndex === undefined || draggedIndex === draggedOverIndex || draggedIndex + 1 === draggedOverIndex) {
      return
    }
    ev.preventDefault()
    draggedOverIndex = index
  }

  function dragLeave (ev: DragEvent, index: number): void {
    if (draggedIndex === undefined) {
      return
    }
    ev.preventDefault()
    if (draggedOverIndex === index) {
      draggedOverIndex = undefined
    }
  }

  async function dragDrop (): Promise<void> {
    if (draggedIndex === undefined || draggedOverIndex === undefined) {
      return
    }
    let modified = false
    if (draggedOverIndex === options.length && draggedIndex !== options.length - 1) {
      options.push(options[draggedIndex])
      options.splice(draggedIndex, 1)
      modified = true
    } else if (draggedOverIndex < draggedIndex) {
      const tmp = options[draggedIndex]
      options[draggedIndex] = options[draggedOverIndex]
      options[draggedOverIndex] = tmp
      modified = true
    } else if (draggedIndex + 1 !== draggedOverIndex) {
      const tmp = options[draggedIndex]
      options[draggedIndex] = options[draggedOverIndex - 1]
      options[draggedOverIndex - 1] = tmp
      modified = true
    }
    if (modified) {
      await updateParent()
    }
  }

  function dragEnd (): void {
    draggedIndex = undefined
    draggedOverIndex = undefined
  }

  let isRootDragging = false
  let rootElement: HTMLElement

  function rootDragStart (ev: DragEvent): void {
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

  function rootDragEnd (): void {
    isRootDragging = false
    dispatch('dragEnd')
  }
</script>

<div class="root" bind:this={rootElement} class:is-dragged={isRootDragging}>
  <div class="header">
    {#if question === undefined}
      <Button noFocus={true} icon={survey.icon.Question} />
      <div class="text">
        <EditBox placeholder={survey.string.QuestionPlaceholder} bind:value={newQuestion} on:change={createQuestion} />
      </div>
    {:else}
      <div role="presentation" draggable={!readonly} on:dragstart={rootDragStart} on:dragend={rootDragEnd}>
        <Button disabled={readonly} icon={questionIcon} on:click={showQuestionParams} />
      </div>
      <div class="text">
        <EditBox
          disabled={readonly}
          placeholder={survey.string.QuestionEmptyPlaceholder}
          bind:value={question.name}
          on:change={changeName}
        />
      </div>
    {/if}
  </div>
  {#if question !== undefined && question.kind !== QuestionKind.STRING}
    <div>
      {#each options as option, index (index)}
        <div
          class="option"
          role="listitem"
          bind:this={draggableElements[index]}
          on:dragover={(ev) => {
            dragOver(ev, index)
          }}
          on:dragleave={(ev) => {
            dragLeave(ev, index)
          }}
          on:drop={dragDrop}
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
              dragStart(ev, index)
            }}
            on:dragend={dragEnd}
          >
            <Button
              disabled={readonly}
              icon={questionIcon}
              kind="list"
              size="small"
              on:click={(ev) => {
                showOptionParams(ev, index)
              }}
            />
          </div>
          <div class="text">
            <EditBox
              disabled={readonly}
              placeholder={survey.string.QuestionOptionPlaceholder}
              bind:value={options[index]}
              on:change={async () => {
                await changeOption(index)
              }}
            />
          </div>
        </div>
      {/each}
    </div>
    {#if !readonly}
      <div
        class="option"
        role="listitem"
        on:dragover={(ev) => {
          dragOver(ev, options.length)
        }}
        on:dragleave={(ev) => {
          dragLeave(ev, options.length)
        }}
        on:drop={dragDrop}
        class:dragged-over={draggedOverIndex === options.length && draggedIndex !== options.length - 1}
      >
        <Button noFocus={true} icon={survey.icon.Question} kind="list" size="small" />
        <div class="text">
          <EditBox placeholder={survey.string.QuestionOptionPlaceholder} bind:value={newOption} on:change={addOption} />
        </div>
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .root {
    font-size: 1.05rem;
    margin-top: 0.5em;
    border-radius: var(--medium-BorderRadius);
    padding: 0.5em;

    &:hover {
      background-color: var(--global-ui-hover-highlight-BackgroundColor);
    }
  }
  .header {
    display: flex;
    align-items: center;
    margin-bottom: 0.25em;
  }
  .text {
    font-size: 0.95em;
    margin-left: 1em;
    margin-right: 1em;
    flex-grow: 1;
  }
  .option {
    display: flex;
    align-items: center;
    padding-left: 2em;
    padding-top: 0.25em;
    padding-bottom: 0.25em;
  }
  .is-dragged {
    opacity: 0.2;
    transition: opacity 0.1s ease-in;
  }
  .dragged-over {
    transition: box-shadow 0.1s ease-in;
    box-shadow: 0 -3px 0 0 var(--primary-button-outline);
  }
</style>
