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
  import { questionCreate } from '../functions/questionCreate'
  import { questionInit } from '../functions/questionInit'
  import QuestionEditor from './QuestionCollectionItemEditor.svelte'
  import { questionDelete } from '../functions/questionDelete'
  import { questionUpdate } from '../functions/questionUpdate'
  import { getEditableQuestionClasses } from '../functions/getEditableQuestionClasses'

  export let object: Survey

  const client = getClient()
  const questionClassDropdownItems: DropdownTextItem[] = getEditableQuestionClasses(client).map((clazz) => ({
    id: clazz._id,
    label: clazz.label,
    icon: clazz.icon
  }))
  const query = createQuery()

  let questions: Question[] = []
  let isMoving = false

  $: {
    query.query<Question>(
      survey.class.Question,
      { space: object._id, attachedTo: object._id, attachedToClass: object._class },
      (res) => {
        questions = res
      },
      { sort: { rank: SortingOrder.Ascending } }
    )
  }

  async function onClickAdd (e: MouseEvent, index: number | null): Promise<void> {
    showPopup(
      DropdownLabelsPopupIntl,
      {
        items: questionClassDropdownItems,
        selected: undefined
      },
      getEventPopupPositionElement(e),
      async (classRef?: Ref<Class<Question>>): Promise<void> => {
        if (classRef === undefined) {
          return
        }
        const prevQuestion = index === null ? null : questions[index] ?? null
        const nextQuestion = (index === null ? questions[0] : questions[index + 1]) ?? null
        const question = questionInit(client, prevQuestion?.rank ?? null, nextQuestion?.rank ?? null, classRef)
        await questionCreate(client, object, question)
      }
    )
  }

  async function onClickMove (index: number, up: boolean): Promise<void> {
    const question1 = questions[index]
    const question2 = questions[index + (up ? -1 : 1)]

    isMoving = true
    const ops = client.apply(object._id)
    await questionUpdate(ops, question1, { rank: question2.rank })
    await questionUpdate(ops, question2, { rank: question1.rank })
    await ops.commit()
    isMoving = false
  }

  async function onClickDelete (index: number): Promise<void> {
    const question = questions[index]
    await questionDelete(client, question)
  }
</script>

<div class="antiSection">
  <div class="antiSection-header">
    <span class="antiSection-header__title">
      <Label label={survey.string.Questions} />
    </span>
  </div>

  {#each questions as question, index (question._id)}
    {#if index === 0}
      <div class="divider">
        <Button icon={IconAdd} shape="circle" size="x-small" on:click={(e) => onClickAdd(e, null)} />
      </div>
    {/if}

    <QuestionEditor object={questions[index]} {index}>
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
    <div class="divider">
      <Button icon={IconAdd} shape="circle" size="small" on:click={(e) => onClickAdd(e, index)} />
    </div>
  {:else}
    <div class="antiSection-empty mt-4">
      <Button
        icon={IconAdd}
        shape="circle"
        size="small"
        on:click={(e) => {
          void onClickAdd(e, null)
        }}
      />
    </div>
  {/each}
</div>

<style lang="scss">
  .divider {
    color: var(--theme-content-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.25rem;
    margin: 0.25rem;
    opacity: 0;
    padding: 0 2rem;
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
    &:focus-within {
      opacity: 1;
    }
  }
</style>
