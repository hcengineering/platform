<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type { Question } from '@hcengineering/questions'
  import type { Training } from '@hcengineering/training'
  import { createQuery } from '@hcengineering/presentation'
  import { calculateAnswersToPass, queryQuestions } from '@hcengineering/questions-resources'
  import { Loading } from '@hcengineering/ui'
  import Score from './Score.svelte'

  export let value: Training

  let questions: Question<unknown>[] = []
  const query = createQuery()
  $: {
    queryQuestions(query, value, 'questions', (result) => {
      questions = result
    })
  }

  let total: number | null = null
  let needed: number | null = null
  $: {
    const calculated = calculateAnswersToPass(questions, value.passingScore)
    total = calculated.assessmentsTotal
    needed = calculated.answersNeeded
  }
</script>

{#if total === null || needed === null}
  <Loading size="small" />
{:else}
  <Score count={needed} {total} score={value.passingScore} />
{/if}
