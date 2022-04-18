<script lang="ts">
    import { IntlString, translate } from '@anticrm/platform'
    import { createQuery } from '@anticrm/presentation';
    import { DropdownLabels } from '@anticrm/ui'
    import { Ref } from '@anticrm/core'
    import { DropdownTextItem } from '@anticrm/ui/src/types';
    import { Board, Card } from '@anticrm/board'
    import board from '../../plugin'

    export let object: Card
    export let label: IntlString
    export let selected: Ref<Board>

    let spaces: DropdownTextItem[] = []
    const spacesQuery = createQuery()
    spacesQuery.query(
        board.class.Board, {},
        async result => {
            spaces = result.map(({_id, name}) => ({id: _id, label: name}))
            const index = spaces.findIndex(({id}) => id === object.space)
            spaces[index].label = await translate(board.string.Current, {label: spaces[index].label})
        }
    )
</script>

<DropdownLabels items={spaces} label={label} bind:selected/>
