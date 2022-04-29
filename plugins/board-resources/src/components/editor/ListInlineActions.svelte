<script lang="ts">
  import { getClient } from '@anticrm/presentation'
  import { State } from '@anticrm/task'
  import { Button } from '@anticrm/ui'
  import board from '../../plugin'

  export let value: State

  const client = getClient()
</script>

{#if value && !value.isArchived}
  <div class="flex-col flex-gap-1">
    <Button
      icon={board.icon.Card}
      label={board.string.ToArchive}
      kind="no-border"
      justify="left"
      on:click={async () => {
        client.update(value, { isArchived: true })
      }}
    />
  </div>
{/if}
