<script lang="ts">
  import { Button, Label } from '@hcengineering/ui'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { DocumentQuery, SortingOrder } from '@hcengineering/core'
  import task, { State } from '@hcengineering/task'
  import board from '../plugin'

  export let query: DocumentQuery<State> = {}

  let archivedLists: State[]
  const client = getClient()
  const cardQuery = createQuery()
  $: cardQuery.query(
    task.class.State,
    { ...query, isArchived: true },
    (result) => {
      archivedLists = result
    },
    { sort: { rank: SortingOrder.Descending } }
  )
</script>

{#if archivedLists}
  {#if !archivedLists.length}
    <div class="flex-center fs-title pb-4">
      <Label label={board.string.NoResults} />
    </div>
  {/if}
  {#each archivedLists as list}
    <div class="w-full flex-row-center pt-2 pr-2 pb-2 pl-2">
      <span class="fs-title overflow-label w-full">
        {list.title}
      </span>
      <div class="w-full">
        <Button
          width={'100%'}
          label={board.string.SendToBoard}
          on:click={async () => {
            client.update(list, { isArchived: false })
          }}
        />
      </div>
    </div>
    <div class="bottom-divider" />
  {/each}
{/if}
