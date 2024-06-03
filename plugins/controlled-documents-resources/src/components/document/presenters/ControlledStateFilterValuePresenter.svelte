<script lang="ts">
  import { ControlledDocumentState } from '@hcengineering/controlled-documents'
  import { controlledDocumentStatesOrder } from '../../../utils'
  import StatePresenter from './StatePresenter.svelte'

  export let value: Map<number, Map<ControlledDocumentState, ControlledDocumentState[]>>

  let states: ControlledDocumentState[] = []
  $: states = Array.from(value.values())
    .map(([_, states]) => states[0])
    .sort(
      (state1, state2) => controlledDocumentStatesOrder.indexOf(state1) - controlledDocumentStatesOrder.indexOf(state2)
    )
</script>

<div class="flex-presenter flex-gap-1-5">
  {#each states as state}
    <StatePresenter value={state} />
  {/each}
</div>
