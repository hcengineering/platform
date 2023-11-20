<script lang="ts">
  import { DocumentQuery, SortingOrder, Status } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import task from '@hcengineering/task'
  import { Button, Label } from '@hcengineering/ui'
  import board from '../plugin'

  export let query: DocumentQuery<Status> = {}

  let archivedLists: Status[]
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
  {#if archivedLists.length === 0}
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
