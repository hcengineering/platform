<script lang="ts">
    import { createEventDispatcher } from 'svelte'
    import { Label, Button, ActionIcon, IconClose, Icon } from '@anticrm/ui'
    import { createQuery, getClient } from '@anticrm/presentation'
    import { Card } from '@anticrm/board'
    import board from '../../plugin'
    import KanbanCard from '../KanbanCard.svelte'
    import { SortingOrder } from '@anticrm/core'
    import { getResource } from '@anticrm/platform'

    let archivedCards: Card[]
    const client = getClient()
    const dispatch = createEventDispatcher()
    const cardQuery = createQuery()
    $: cardQuery.query(board.class.Card, {isArchived: true},
        result => { archivedCards = result },
        { sort: { rank: SortingOrder.Descending } }
    )
</script>

<div class="antiPopup antiPopup-withHeader antiPopup-withCategory w-60">
    <div class="ap-space"/>
    <div class="flex-row-center header">
        <div class="flex-center flex-grow">
            <Label label={board.string.Archive}/>
        </div>
        <div class="close-icon mr-1">
            <ActionIcon icon={IconClose} size={'small'} action={() => { dispatch('close') }} />
        </div>
    </div>
    <div class="ap-space bottom-divider"/>
    {#if archivedCards}
        {#each archivedCards as card}
            <KanbanCard object={card}/>
            <div class="flex-center flex-gap-2 w-full">
                <Button label={board.string.SendToBoard}
                    on:click={async (e) => {
                        const deleteAction = await getResource(board.cardActionHandler.SendToBoard)
                        deleteAction(card, client, e)
                    }}/>
                <Button label={board.string.Delete}
                    on:click={async (e) => {
                        const deleteAction = await getResource(board.cardActionHandler.Delete)
                        deleteAction(card, client, e)
                    }}/>
            </div>
        {/each}
    {/if}
    <div class="ap-space"/>
</div>
