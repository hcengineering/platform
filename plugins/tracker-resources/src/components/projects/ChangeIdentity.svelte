<script lang="ts">
  import presentation, { Card } from '@hcengineering/presentation'
  import EditBox from '@hcengineering/ui/src/components/EditBox.svelte'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'

  export let identifier: string
  export let projectsIdentifiers: Set<string>

  let newIdentifier = identifier

  const dispatch = createEventDispatcher()

  function save () {
    dispatch('close', newIdentifier)
  }
</script>

<Card
  label={projectsIdentifiers.has(newIdentifier) ? tracker.string.IdentifierExists : tracker.string.ProjectIdentifier}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={!!newIdentifier && newIdentifier !== identifier && !projectsIdentifiers.has(newIdentifier)}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="float-left-box">
    <div class="float-left p-2">
      <EditBox bind:value={newIdentifier} uppercase />
    </div>
  </div>
</Card>
