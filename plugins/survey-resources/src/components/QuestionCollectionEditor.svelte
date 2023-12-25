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
    showPopup
  } from '@hcengineering/ui'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Question, Survey } from '@hcengineering/survey'
  import { Class, Ref, SortingOrder } from '@hcengineering/core'
  import { questionCreate } from '../utils/questionCreate'
  import QuestionEditor from './QuestionCollectionItemEditor.svelte'
  import { questionDelete } from '../utils/questionDelete'
  import { questionUpdate } from '../utils/questionUpdate'
  import { getEditableQuestionClasses } from '../utils/getEditableQuestionClasses'
  import { themeStore } from '@hcengineering/theme'
  import { questionInit } from '../utils/questionInit'

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
        const question = await questionInit(
          $themeStore.language,
          client.getHierarchy(),
          classRef,
          prevQuestion?.rank ?? null,
          nextQuestion?.rank ?? null
        )
        await questionCreate<Question>(client, object, {
          ...question,
          _class: classRef
        })
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
  {#each questions as question, index (question._id)}
    {#if index === 0}
      <div class="divider divider-first">
        <div class="divider--button">
          <Button icon={IconAdd} shape="circle" kind="regular" size="small" on:click={(e) => onClickAdd(e, null)} />
        </div>
      </div>
    {/if}

    <QuestionEditor object={questions[index]} {index}>
      <Button
        icon={IconUp}
        shape="circle"
        kind="ghost"
        size="medium"
        disabled={index === 0 || isMoving}
        on:click={() => {
          void onClickMove(index, true)
        }}
      />
      <Button
        icon={IconDown}
        shape="circle"
        kind="ghost"
        size="medium"
        disabled={index === questions.length - 1 || isMoving}
        on:click={() => {
          void onClickMove(index, false)
        }}
      />
      <Button
        icon={IconDelete}
        shape="circle"
        kind="ghost"
        size="medium"
        on:click={() => {
          void onClickDelete(index)
        }}
      />
    </QuestionEditor>
    <div class="divider">
      <div class="divider--button">
        <Button icon={IconAdd} shape="circle" kind="regular" size="small" on:click={(e) => onClickAdd(e, index)} />
      </div>
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
  .no-border {
    border-bottom: none;
  }

  .divider {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin: -1rem 0 0;
    overflow: visible;
    padding: 1rem 0;
    width: 100%;

    &:before,
    &:after {
      background-color: var(--theme-divider-color);
      content: '';
      height: 1px;
      width: 100%;
    }

    &--button {
      display: none;
      padding-left: 0.25rem;
      padding-right: 0.25rem;
      position: relative;
      margin: -1em auto -1em;
      z-index: 1;
    }

    &:hover &--button {
      display: inherit;
    }
  }
</style>
