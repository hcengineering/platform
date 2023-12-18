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
  import survey from '../plugin'
  import {
    Button,
    DropdownLabelsPopupIntl,
    DropdownTextItem,
    getEventPopupPositionElement,
    IconAdd,
    IconDelete,
    IconDown,
    IconUp,
    Label,
    showPopup
  } from '@hcengineering/ui'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Question, Survey } from '@hcengineering/survey'
  import { Class, Ref, SortingOrder } from '@hcengineering/core'
  import { getEditableQuestionDataClasses } from '../functions/getEditableQuestionDataClasses'
  import { questionCreate } from '../functions/questionCreate'
  import { questionInit } from '../functions/questionInit'
  import QuestionEditor from './QuestionEditor.svelte'
  import { questionDelete } from '../functions/questionDelete'
  import { questionUpdate } from '../functions/questionUpdate'

  export let object: Survey

  const client = getClient()
  const questionDataClassDropdownItems: DropdownTextItem[] = getEditableQuestionDataClasses(client).map((clazz) => ({
    id: clazz._id,
    label: clazz.label,
    icon: clazz.icon
  }))
  const query = createQuery()

  let questions: Question[] = []
  const editors: Record<Ref<Question>, QuestionEditor> = {}
  let lastCreatedQuestionId: Ref<Question> | null = null
  let isMoving = false

  $: if (object.questions > 0) {
    query.query<Question>(
      survey.class.Question,
      { space: object.space, attachedTo: object._id },
      (res) => {
        questions = res
      },
      { sort: { rank: SortingOrder.Ascending } }
    )
  } else {
    query.unsubscribe()
  }

  $: if (lastCreatedQuestionId && editors[lastCreatedQuestionId]) {
    editors[lastCreatedQuestionId].startEditing()
    lastCreatedQuestionId = null
  }

  async function onClickAdd (e: MouseEvent, index: number | null): Promise<void> {
    showPopup(
      DropdownLabelsPopupIntl,
      {
        items: questionDataClassDropdownItems,
        selected: undefined
      },
      getEventPopupPositionElement(e),
      async (dataClassRef?: Ref<Class<Question>>): Promise<void> => {
        if (dataClassRef === undefined) {
          return
        }
        const prevQuestion = index === null ? null : questions[index] ?? null
        const nextQuestion = (index === null ? questions[0] : questions[index + 1]) ?? null
        const question = questionInit(client, prevQuestion?.rank ?? null, nextQuestion?.rank ?? null, dataClassRef)
        lastCreatedQuestionId = await questionCreate(client, object, question)
      }
    )
  }

  async function onClickMove (index: number, up: boolean): Promise<void> {
    const question1 = questions[index]
    const question2 = questions[index + (up ? -1 : 1)]
    rollback(question1)
    rollback(question2)

    isMoving = true
    const ops = client.apply(object._id)
    await questionUpdate(ops, question1, { rank: question2.rank })
    await questionUpdate(ops, question2, { rank: question1.rank })
    await ops.commit()
    isMoving = false
  }

  async function onClickDelete (index: number): Promise<void> {
    const question = questions[index]
    rollback(question)
    await questionDelete(client, question)
  }

  function rollback (question: Question): void {
    editors[question._id]?.rollback()
  }
</script>

<div class="antiSection">
  <div class="antiSection-header">
    <span class="antiSection-header__title">
      <Label label={survey.string.Questions} />
    </span>
  </div>

  {#if questions.length > 0}
    {#each questions as question, index}
      {#if index === 0}
        <button class="divider my-1" on:click={(e) => onClickAdd(e, null)}>
          <IconAdd size="medium" />
        </button>
      {/if}
      <QuestionEditor bind:this={editors[question._id]} object={questions[index]} {index}>
        <Button
          icon={IconUp}
          shape="circle"
          kind="ghost"
          disabled={index === 0 || isMoving}
          on:click={() => {
            void onClickMove(index, true)
          }}
        />
        <Button
          icon={IconDown}
          shape="circle"
          kind="ghost"
          disabled={index === questions.length - 1 || isMoving}
          on:click={() => {
            void onClickMove(index, false)
          }}
        />
        <Button
          icon={IconDelete}
          shape="circle"
          kind="ghost"
          on:click={() => {
            void onClickDelete(index)
          }}
        />
      </QuestionEditor>
      <button class="divider my-1" on:click={(e) => onClickAdd(e, index)}>
        <IconAdd size="medium" />
      </button>
    {/each}
  {:else}
    <div class="antiSection-empty mt-4">
      <Button icon={IconAdd} width="100%" kind="ghost" on:click={(e) => onClickAdd(e, null)} />
    </div>
  {/if}
</div>

<style lang="scss">
  .divider {
    color: var(--theme-content-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.16s;
    width: 100%;

    &:before,
    &:after {
      content: ' ';
      height: 1px;
      width: 100%;
      min-height: 1px;
      background-color: var(--theme-divider-color);
    }

    &:hover,
    &:focus {
      opacity: 1;
    }
  }
</style>
