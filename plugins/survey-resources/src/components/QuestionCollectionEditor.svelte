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

<script lang='ts'>
  import survey from '../plugin'
  import {
    Button,
    DropdownLabelsPopupIntl,
    DropdownTextItem,
    getEventPopupPositionElement,
    IconAdd,
    Label,
    showPopup
  } from '@hcengineering/ui'
  import { createQuery } from '@hcengineering/presentation'
  import { Question, Survey } from '@hcengineering/survey'
  import { Class, Ref, SortingOrder } from '@hcengineering/core'
  import { getEditableQuestionClasses } from '../functions/getEditableQuestionClasses'
  import { questionCreate } from '../functions/questionCreate'
  import { questionInit } from '../functions/questionInit'

  export let object: Survey

  const query = createQuery()
  let questions: Question[] = []

  $: if (object.questions > 0) {
    query.query<Question>(
      survey.class.Question,
      { space: object.space, attachedTo: object._id },
      (res) => { questions = res },
      { sort: { rank: SortingOrder.Ascending } }
    )
  } else {
    query.unsubscribe()
  }

  const questionClassDropdownItems: DropdownTextItem[] = getEditableQuestionClasses()
    .map((clazz) => ({
      id: clazz._id,
      label: clazz.label,
      icon: clazz.icon
    }))

  // import { Question, Survey } from '@hcengineering/survey'
  // import {
  //   Button,
  //   DropdownLabelsPopupIntl,
  //   type DropdownTextItem,
  //   IconAdd,
  //   Label,
  //   showPopup
  // } from '@hcengineering/ui'
  // import { createQuery, getClient } from '@hcengineering/presentation'
  // import { Class, DocData, fillDefaults, Ref, SortingOrder } from '@hcengineering/core'
  // import { LexoRank } from 'lexorank'
  //
  // import QuestionTemplateEditor from './QuestionTemplateEditor.svelte'
  //
  // export let objectId
  // export let _class
  // export let space
  // export let object: SurveyTemplate
  // export let key
  // export let disabled
  //
  //
  // const editableQuestionTemplateClasses = getEditableQuestionTemplateClasses()
  //
  // const questionTemplateDropdownItems: DropdownTextItem[] = editableQuestionTemplateClasses.map((clazz) => {
  //   return {
  //     id: clazz._id,
  //     label: clazz.label,
  //     icon: clazz.icon
  //   }
  // })
  //

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
        const question = questionInit(classRef, prevQuestion?.rank ?? null, nextQuestion?.rank ?? null)
        await questionCreate(object, classRef, question)
      }
    )
  }
</script>

<div class="antiSection">
  <div class="antiSection-header">
    <span class="antiSection-header__title">
      <Label label={survey.string.SurveyQuestions}/>
    </span>
  </div>

  {#if questions.length > 0}
    {#each questions as question, index}
      {#if index === 0}
        <button class="divider my-1" on:click={(e) => onClickAdd(e, null)}>
          <IconAdd size="medium" />
        </button>
      {/if}
      {question._class} {question.rank} { JSON.stringify(question) }
<!--      <QuestionTemplateEditor-->
<!--        bind:object={questions[index]}-->
<!--        index={index}-->
<!--      />-->
      <button class="divider my-1" on:click={(e) => onClickAdd(e, index)}>
        <IconAdd size="medium" />
      </button>
    {/each}
  {:else}
    <div class='antiSection-empty mt-4'>
      <Button
        icon={IconAdd}
        width='100%'
        kind='ghost'
        on:click={(e) => onClickAdd(e, null)}
      />
    </div>
  {/if}

</div>

<style lang='scss'>
  .divider {
    color: var(--theme-content-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: .25rem;
    opacity: 0;
    transition: opacity .16s;
    width: 100%;

    &:before, &:after {
      content: ' ';
      height: 1px;
      width: 100%;
      min-height: 1px;
      background-color: var(--theme-divider-color);
    }

    &:hover, &:focus {
      opacity: 1;
    }
  }
</style>
