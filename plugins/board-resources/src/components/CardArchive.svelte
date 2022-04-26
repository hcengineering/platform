<script lang="ts">
    import { Button, Label } from '@anticrm/ui'
    import { createQuery, getClient } from '@anticrm/presentation'
    import { Card } from '@anticrm/board'
    import { DocumentQuery, SortingOrder } from '@anticrm/core'
    import { getResource } from '@anticrm/platform'
    import board from '../plugin'
    import KanbanCard from './KanbanCard.svelte'

    export let query: DocumentQuery<Card> = {}

    let archivedCards: Card[]
    const client = getClient()
    const cardQuery = createQuery()
    $: cardQuery.query(board.class.Card, { ...query, isArchived: true },
      result => { archivedCards = result },
      { sort: { rank: SortingOrder.Descending } }
    )
</script>

{#if archivedCards}
    {#if !archivedCards.length}
        <div class="flex-center fs-title pb-4">
            <Label label={board.string.NoResults}/>
        </div>
    {/if}
    {#each archivedCards as card}
        <KanbanCard object={card}/>
        <div class="flex-center flex-gap-2 w-full">
            <Button label={board.string.SendToBoard}
                on:click={async (e) => {
                    const unarchiveAction = await getResource(board.cardActionHandler.SendToBoard)
                    unarchiveAction(card, client, e)
                }}/>
            <Button label={board.string.Delete}
                on:click={async (e) => {
                    const deleteAction = await getResource(board.cardActionHandler.Delete)
                    deleteAction(card, client, e)
                }}/>
        </div>
    {/each}
{/if}
