<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { type Class, type DocumentUpdate } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Button, IconMoreV, Loading } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { showMenu } from '@hcengineering/view-resources'
  import type {
    Answer,
    Question,
    QuestionDataEditor,
    QuestionDataEditorComponent,
    QuestionDataPresenter,
    QuestionMixin
  } from '@hcengineering/questions'
  import { deepEqual } from 'fast-equals'
  import { canUpdateQuestion, getQuestionMixin, isAssessment, updateQuestion } from '../utils'
  import LabelEditor from './LabelEditor.svelte'
  import LayoutRow from './LayoutRow.svelte'

  // TODO: Move to `generics` attribute when IDE supports it
  //  https://youtrack.jetbrains.com/issue/WEB-57377
  type Q = Question<unknown>

  export let index: number = 0
  export let question: Q

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let questionClass: Class<Q>
  let questionMixin: QuestionMixin<Q, Answer<Q, unknown>>
  let editorPromise: Promise<QuestionDataEditor<Q>>
  let presenterPromise: Promise<QuestionDataPresenter<Q>>
  let ed: QuestionDataEditorComponent<Q> | undefined = undefined
  $: if (question._class !== questionClass?._id) {
    questionClass = hierarchy.getClass<Q>(question._class)
    questionMixin = getQuestionMixin(questionClass._id)
    editorPromise = getResource(questionMixin.questionDataEditor)
    presenterPromise = getResource(questionMixin.questionDataPresenter)
  }

  let readonly: boolean = true
  $: readonly = !canUpdateQuestion(question)

  // A copy of current object to be passed to nested editor
  let draft: typeof question = question
  $: {
    const externalChangesDetected = !deepEqual(question, draft)
    if (externalChangesDetected) {
      draft = question
    }
  }

  let isSubmitting = false

  async function submit<Q extends Question<unknown>> (update: DocumentUpdate<Q>): Promise<void> {
    if (readonly) {
      return
    }
    isSubmitting = true
    await updateQuestion(client, question, update)
    isSubmitting = false
  }

  async function onTitleChange (): Promise<void> {
    if (readonly) {
      return
    }
    await submit({ title: draft.title })
  }

  async function showContextMenu (evt: MouseEvent): Promise<void> {
    showMenu(evt, { object: draft, excludedActions: [view.action.Open] })
  }

  export function focus (): void {
    void editorPromise.then(() => ed?.focus())
  }
</script>

<form class="pt-1 pb-6">
  <LayoutRow baseline>
    <svelte:fragment slot="drag">
      <Button
        icon={IconMoreV}
        shape="circle"
        kind="ghost"
        size="x-small"
        disabled={isSubmitting || readonly}
        on:click={showContextMenu}
        padding="0 0"
      />
    </svelte:fragment>

    <svelte:fragment slot="bullet">
      <span class="text-xl font-medium">
        {index + 1}.
      </span>
    </svelte:fragment>

    <svelte:fragment slot="label">
      <span class="text-xl font-medium caption-color">
        <LabelEditor bind:value={draft.title} on:change={onTitleChange} {readonly} />
      </span>
    </svelte:fragment>
  </LayoutRow>

  {#if readonly}
    {#await presenterPromise}
      <Loading />
    {:then presenter}
      <svelte:component
        this={presenter}
        questionData={question.questionData}
        assessmentData={isAssessment(question) ? question.assessmentData : null}
      />
    {/await}
  {:else}
    {#await editorPromise}
      <Loading />
    {:then editor}
      <svelte:component
        this={editor}
        bind:this={ed}
        {submit}
        questionData={question.questionData}
        assessmentData={isAssessment(question) ? question.assessmentData : null}
      />
    {/await}
  {/if}
</form>

<style lang="scss">
  .actions {
    height: 0.8rem;
    overflow: visible;
  }
</style>
