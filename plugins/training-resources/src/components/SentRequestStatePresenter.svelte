<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { StateTag, StateType } from '@hcengineering/ui'
  import type { TrainingRequest } from '@hcengineering/training'

  import training from '../plugin'

  export let value: TrainingRequest
</script>

<div class="inline-flex">
  {#if value.canceledOn === null}
    <StateTag type={StateType.Positive} label={training.string.Active} />
  {:else}
    <StateTag type={StateType.Negative} label={training.string.Canceled} />
  {/if}
</div>
