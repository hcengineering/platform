<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type { Employee } from '@hcengineering/contact'
  import { type Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Button, Loading, ProgressCircle, showPopup } from '@hcengineering/ui'
  import { type TrainingAttempt, type TrainingRequest } from '@hcengineering/training'
  import type { ComponentProps } from 'svelte'
  import training from '../plugin'
  import { type CompletionMap, CompletionMapValueState, getCompletionMap } from '../utils'
  import SentRequestCompletionPopup from './SentRequestCompletionPopup.svelte'

  export let value: TrainingRequest

  let completedCount: number | null = null

  // TODO: Use it to show popup on click
  let completionMap: CompletionMap | null = null

  const attemptsQuery = createQuery()
  $: {
    attemptsQuery.query<TrainingAttempt>(
      training.class.TrainingAttempt,
      {
        attachedTo: value._id,
        attachedToClass: value._class,
        space: value.space
      },
      (result) => {
        const latestAttemptsMap = new Map<Ref<Employee>, TrainingAttempt>()
        for (const attempt of result) {
          latestAttemptsMap.set(attempt.owner, latestAttemptsMap.get(attempt.owner) ?? attempt)
        }
        completionMap = getCompletionMap(value, latestAttemptsMap)

        const completedStates = [
          CompletionMapValueState.Passed,
          ...(value.maxAttempts === null ? [] : [CompletionMapValueState.Failed])
        ]

        completedCount = [...completionMap.values()].filter(
          (value) => value !== null && completedStates.includes(value.state)
        ).length
      },
      {
        sort: {
          submittedOn: SortingOrder.Descending
        }
      }
    )
  }

  function showDetails (event: Event): void {
    if (completionMap === null) {
      return
    }
    const props: ComponentProps<SentRequestCompletionPopup> = {
      completionMap,
      request: value
    }
    showPopup(SentRequestCompletionPopup, props, event.target as HTMLElement)
  }
</script>

{#if completionMap === null || completedCount === null}
  <Loading size="small" />
{:else}
  <Button kind="link" width="max-content" on:click={showDetails}>
    <span slot="content" class="flex-row-center">
      <span class="mr-2">
        <ProgressCircle
          primary
          size="small"
          max={1}
          value={value.trainees.length > 0 ? completedCount / value.trainees.length : 0}
        />
      </span>
      {completedCount}/{value.trainees.length}
    </span>
  </Button>
{/if}
