<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { TrainingAttemptState, trainingAttemptStateOrder } from '@hcengineering/training'
  import TrainingAttemptStatePresenter from './TrainingAttemptStatePresenter.svelte'

  export let value: Map<number, Map<TrainingAttemptState, TrainingAttemptState[]>>

  let states: TrainingAttemptState[] = []
  $: states = Array.from(value.values())
    .map(([, states]) => states[0])
    .sort((state1, state2) => trainingAttemptStateOrder.indexOf(state1) - trainingAttemptStateOrder.indexOf(state2))
</script>

<div class="flex-presenter flex-gap-1-5">
  {#each states as state}
    <TrainingAttemptStatePresenter value={state} />
  {/each}
</div>
