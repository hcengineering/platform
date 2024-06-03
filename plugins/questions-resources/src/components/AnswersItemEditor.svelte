<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type {
    Answer,
    AnswerDataEditor,
    AnswerDataOf,
    AnswerDataPresenter,
    Question,
    QuestionMixin
  } from '@hcengineering/questions'
  import type { Class, Ref } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Icon, Loading } from '@hcengineering/ui'
  import questions from '../plugin'
  import { assessAnswer, getQuestionMixin, isAssessment, updateAnswer } from '../utils'
  import LabelEditor from './LabelEditor.svelte'
  import LayoutRow from './LayoutRow.svelte'

  // TODO: Move to `generics` attribute when IDE supports it
  //  https://youtrack.jetbrains.com/issue/WEB-57377
  type Q = Question<unknown>
  type A = Answer<Q, unknown>

  export let index: number = 0
  export let readonly: boolean = true
  export let question: Q
  export let answer: A | null
  export let createAnswer: (answerClassRef: Ref<Class<A>>, answerData: AnswerDataOf<A>) => Promise<void>
  export let showStatus: boolean = false
  export let showDiff: boolean = false

  const hierarchy = getClient().getHierarchy()
  const isSubmitting = false

  let questionClass: Class<Q>
  let mixin: QuestionMixin<Q, A> | null = null
  let presenterPromise: Promise<AnswerDataPresenter<Q, A>>
  let editorPromise: Promise<AnswerDataEditor<Q, A>>
  let answerClassRef: Ref<Class<A>>
  $: if (question._class !== questionClass?._id) {
    questionClass = hierarchy.getClass(question._class)
    mixin = getQuestionMixin(questionClass._id)
    editorPromise = getResource(mixin.answerDataEditor)
    presenterPromise = getResource(mixin.answerDataPresenter)
    answerClassRef = mixin.answerClassRef
  }

  let passedPromise: Promise<boolean | undefined>
  $: {
    if (showStatus && isAssessment(question)) {
      if (answer === null) {
        passedPromise = Promise.resolve(false)
      } else {
        passedPromise = assessAnswer(question, answer as Answer<typeof question, any>).then(
          (result) => result?.passed === true
        )
      }
    } else {
      passedPromise = Promise.resolve(undefined)
    }
  }

  async function submit (answerData: AnswerDataOf<A>): Promise<void> {
    if (answer === null) {
      await createAnswer(answerClassRef, answerData)
    } else {
      answer = {
        ...answer,
        answerData
      }
      await updateAnswer(getClient(), answer, { answerData })
    }
  }
</script>

<form class="pt-1 pb-6 pr-2">
  <LayoutRow baseline>
    <svelte:fragment slot="bullet">
      <span class="text-xl font-medium">
        {index + 1}.
      </span>
    </svelte:fragment>

    <svelte:fragment slot="label">
      <span class="text-xl font-medium caption-color">
        <LabelEditor bind:value={question.title} readonly />
      </span>
    </svelte:fragment>

    <svelte:fragment slot="icon">
      {#await passedPromise}
        <Loading size="inline" shrink />
      {:then passed}
        {#if passed === true}
          <span class="passed"><Icon icon={questions.icon.Passed} size="medium" /></span>
        {:else if passed === false}
          <span class="failed"><Icon icon={questions.icon.Failed} size="medium" /></span>
        {:else if isSubmitting}
          <Loading size="inline" shrink />
        {/if}
      {/await}
    </svelte:fragment>
  </LayoutRow>

  {#if readonly}
    {#await presenterPromise}
      <Loading />
    {:then presenter}
      <svelte:component
        this={presenter}
        questionData={question.questionData}
        answerData={answer?.answerData ?? null}
        assessmentData={isAssessment(question) ? question.assessmentData : null}
        {showDiff}
      />
    {/await}
  {:else}
    {#await editorPromise}
      <Loading />
    {:then editor}
      <svelte:component
        this={editor}
        questionData={question.questionData}
        answerData={answer?.answerData ?? null}
        {submit}
      />
    {/await}
  {/if}
</form>

<style lang="scss">
  .failed {
    color: var(--negative-button-default);
  }
  .passed {
    color: var(--positive-button-default);
  }
</style>
