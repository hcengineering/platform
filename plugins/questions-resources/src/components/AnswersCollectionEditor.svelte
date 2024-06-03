<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->
<script lang="ts">
  import type { Answer, AnswerDataOf, Question } from '@hcengineering/questions'
  import { type Class, type Doc, type Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import questions from '../plugin'
  import { createAnswer } from '../utils'
  import AnswersItemEditor from './AnswersItemEditor.svelte'

  // TODO: Move to `generics` attribute when IDE supports it
  //  https://youtrack.jetbrains.com/issue/WEB-57377
  type QuestionsParent = $$Generic<Doc>
  type AnswersParent = $$Generic<Doc>

  export let readonly: boolean = true
  export let questionsParent: QuestionsParent
  export let questionsKey: Extract<keyof QuestionsParent, string>
  export let answersParent: AnswersParent | null = null
  export let answersKey: Extract<keyof AnswersParent, string>
  export let showStatuses: boolean = false
  export let showDiffs: boolean = false

  let questionsCollection: Question<unknown>[] = []
  const questionsQuery = createQuery()
  $: {
    questionsQuery.query(
      questions.class.Question,
      {
        space: questionsParent.space,
        attachedTo: questionsParent._id,
        attachedToClass: questionsParent._class,
        collection: questionsKey
      },
      (result) => {
        questionsCollection = result
      },
      { sort: { rank: SortingOrder.Ascending } }
    )
  }

  let answersMap: Map<Ref<Question<unknown>>, Answer<Question<unknown>, unknown>> | null = null
  const answersQuery = createQuery()
  $: {
    if (answersParent === null) {
      answersMap = null
      answersQuery.unsubscribe()
    } else {
      answersQuery.query<Answer<Question<unknown>, unknown>>(
        questions.class.Answer,
        {
          space: answersParent.space,
          attachedTo: answersParent._id,
          attachedToClass: answersParent._class,
          collection: answersKey
        },
        (result) => {
          answersMap = new Map(result.map((answer) => [answer.question, answer]))
        }
      )
    }
  }

  async function create<Q extends Question<unknown>, A extends Answer<Q, unknown>> (
    question: Q,
    answerClassRef: Ref<Class<A>>,
    data: AnswerDataOf<A>
  ): Promise<void> {
    if (readonly || answersParent === null) {
      return
    }
    await createAnswer(
      getClient(),
      answerClassRef,
      answersParent.space,
      answersParent._id,
      answersParent._class,
      answersKey,
      question._id,
      data
    )
  }
</script>

<div class="antiSection pt-4 pb-4">
  {#each questionsCollection as question, index (question._id)}
    {#if index === 0}
      <div class="divider" />
    {/if}
    <AnswersItemEditor
      {readonly}
      {index}
      {question}
      answer={answersMap?.get(question._id) ?? null}
      createAnswer={(answerClassRef, data) => create(question, answerClassRef, data)}
      showStatus={showStatuses}
      showDiff={showDiffs}
    />
    <div class="divider" />
  {:else}
    <div class="antiSection-empty">
      <Label label={questions.string.NoQuestions} />
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
  }
</style>
