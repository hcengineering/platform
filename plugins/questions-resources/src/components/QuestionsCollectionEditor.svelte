<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type { Question } from '@hcengineering/questions'
  import questions from '../plugin'
  import {
    Button,
    DropdownLabelsPopupIntl,
    getEventPopupPositionElement,
    IconAdd,
    Label,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Class, type Doc, Ref, SortingOrder } from '@hcengineering/core'
  import { createQuestion, getQuestionClasses, initQuestion } from '../utils'
  import QuestionsItemEditor from './QuestionsItemEditor.svelte'

  // TODO: Move to `generics` attribute when IDE supports it
  //  https://youtrack.jetbrains.com/issue/WEB-57377
  type Parent = $$Generic<Doc>

  export let object: Parent
  export let key: Extract<keyof typeof object, string>
  export let readonly: boolean = true
  export let questionClasses: Array<Class<Question<unknown>>> = getQuestionClasses()

  const client = getClient()
  const query = createQuery()

  let questionsCollection: Question<unknown>[] = []
  $: {
    query.query(
      questions.class.Question,
      {
        space: object.space,
        attachedTo: object._id,
        attachedToClass: object._class,
        collection: key
      },
      (result) => {
        questionsCollection = result
      },
      { sort: { rank: SortingOrder.Ascending } }
    )
  }

  const editors: Record<Ref<Question<unknown>>, QuestionsItemEditor> = {}
  let lastAddedQuestionId: Ref<Question<unknown>> | null = null
  $: if (lastAddedQuestionId !== null) {
    const editor = editors[lastAddedQuestionId]
    if (editor !== undefined) {
      editor.focus()
      lastAddedQuestionId = null
    }
  }

  async function onClickAdd (e: MouseEvent, index: number | null): Promise<void> {
    if (readonly) {
      return
    }

    showPopup(
      DropdownLabelsPopupIntl,
      {
        items: questionClasses.map(({ _id, label, icon }) => ({ id: _id, label, icon })),
        selected: undefined
      },
      getEventPopupPositionElement(e),
      async (classRef?: Ref<Class<Question<unknown>>>): Promise<void> => {
        if (readonly || classRef === undefined) {
          return
        }
        const prevQuestion = index === null ? null : questionsCollection[index] ?? null
        const nextQuestion = (index === null ? questionsCollection[0] : questionsCollection[index + 1]) ?? null
        const question = await initQuestion(
          $themeStore.language,
          classRef,
          prevQuestion?.rank ?? null,
          nextQuestion?.rank ?? null
        )
        lastAddedQuestionId = await createQuestion(
          client,
          classRef,
          object.space,
          object._id,
          object._class,
          key,
          question
        )
      }
    )
  }
</script>

<div class="antiSection pt-4 pb-4">
  {#each questionsCollection as question, index (question._id)}
    {#if index === 0}
      <div class="divider">
        {#if !readonly}
          <div class="divider--button">
            <Button icon={IconAdd} shape="circle" kind="regular" size="small" on:click={(e) => onClickAdd(e, null)} />
          </div>
        {/if}
      </div>
    {/if}

    <QuestionsItemEditor {question} {index} bind:this={editors[question._id]} />

    <div class="divider">
      {#if !readonly}
        <div class="divider--button">
          <Button icon={IconAdd} shape="circle" kind="regular" size="small" on:click={(e) => onClickAdd(e, index)} />
        </div>
      {/if}
    </div>
  {:else}
    <div class="antiSection-empty">
      {#if !readonly}
        <Button
          icon={IconAdd}
          shape="circle"
          size="small"
          on:click={(e) => {
            void onClickAdd(e, null)
          }}
        />
      {:else}
        <Label label={questions.string.NoQuestions} />
      {/if}
    </div>
  {/each}
</div>

<style lang="scss">
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
