<script lang="ts">
  import { Button, IconDelete, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { Trigger } from '../models'
  import automation from '../plugin'
  import TriggerPresenter from './presenters/TriggerPresenter.svelte'
  import AddActionTrigger from './AddActionTrigger.svelte'

  export let trigger: Trigger | undefined = undefined
  const dispatch = createEventDispatcher()

  function clearTrigger () {
    trigger = undefined
    dispatch('trigger', trigger)
  }
</script>

<div class="flex-col">
  <div class="fs-title mb-4">
    <Label label={automation.string.Trigger} />
  </div>
  {#if trigger}
    <div class="flex-between">
      <TriggerPresenter value={trigger} />
      <Button icon={IconDelete} kind="ghost" on:click={clearTrigger} />
    </div>
  {:else}
    <AddActionTrigger on:trigger on:targetClass />
  {/if}
</div>
