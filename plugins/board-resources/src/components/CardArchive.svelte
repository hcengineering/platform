<script lang="ts">
  import { Card } from '@hcengineering/board'
  import { DocumentQuery, SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, Label } from '@hcengineering/ui'
  import type { Action } from '@hcengineering/view'
  import { invokeAction } from '@hcengineering/view-resources'
  import board from '../plugin'
  import { getCardActions } from '../utils/CardActionUtils'
  import KanbanCard from './KanbanCard.svelte'

  export let query: DocumentQuery<Card> = {}

  let archivedCards: Card[]
  let actions: Action[] = []
  const client = getClient()
  const cardQuery = createQuery()
  $: cardQuery.query(
    board.class.Card,
    { ...query, isArchived: true },
    (result) => {
      archivedCards = result
    },
    { sort: { rank: SortingOrder.Descending } }
  )
  getCardActions(client, { _id: { $in: [board.action.SendToBoard, board.action.Delete] } }).then(async (result) => {
    actions = result
  })
</script>

{#if archivedCards}
  {#if !archivedCards.length}
    <div class="flex-center fs-title pb-4">
      <Label label={board.string.NoResults} />
    </div>
  {/if}
  {#each archivedCards as card}
    <KanbanCard object={card} />
    <div class="flex-center flex-gap-2 w-full">
      <Button
        label={board.string.SendToBoard}
        on:click={(e) => {
          const unarchiveAction = actions.find((a) => a._id === board.action.SendToBoard)
          if (unarchiveAction) {
            invokeAction(card, e, unarchiveAction.action, unarchiveAction.actionProps)
          }
        }}
      />
      <Button
        label={board.string.Delete}
        on:click={async (e) => {
          const deleteAction = actions.find((a) => a._id === board.action.Delete)
          if (deleteAction) {
            invokeAction(card, e, deleteAction.action, deleteAction.actionProps)
          }
        }}
      />
    </div>
  {/each}
{/if}
