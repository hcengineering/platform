<script lang="ts">
  import { DocumentState } from '@hcengineering/controlled-documents'
  import StatePresenter from './StatePresenter.svelte'
  import { documentStatesOrder } from '../../../utils'

  export let value: Map<number, Map<DocumentState, DocumentState[]>>

  let states: DocumentState[] = []
  $: states = Array.from(value.values())
    .map(([_, states]) => states[0])
    .sort((state1, state2) => documentStatesOrder.indexOf(state1) - documentStatesOrder.indexOf(state2))
</script>

<div class="flex-presenter flex-gap-1-5">
  {#each states as state}
    <StatePresenter value={state} />
  {/each}
</div>
