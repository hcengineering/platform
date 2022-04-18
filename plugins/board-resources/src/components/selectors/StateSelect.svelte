<script lang="ts">
    import { IntlString, translate } from '@anticrm/platform'
    import { createQuery } from '@anticrm/presentation';
    import { DropdownLabels } from '@anticrm/ui'
    import { Ref, SortingOrder, Space } from '@anticrm/core'
    import { DropdownTextItem } from '@anticrm/ui/src/types';
    import task, { State } from '@anticrm/task';
    import { Card } from '@anticrm/board'
    import board from '../../plugin'

    export let object: Card
    export let label: IntlString
    export let selected: Ref<State>
    export let space: Ref<Space>

    let states: DropdownTextItem[] = []
    const statesQuery = createQuery()
    statesQuery.query(
        task.class.State, { space },
        async result => {
            if(!result) return
            states = result.map(({_id, title }) => ({id: _id, label: title}));
            [{ _id: selected }] = result
            if (object.space === space) {
                const index = states.findIndex(({id}) => id === object.state)
                states[index].label = await translate(board.string.Current, {label: states[index].label})
                selected = object.state
            }
        },
        { sort: { rank: SortingOrder.Ascending } }
    )
</script>

<DropdownLabels items={states} label={label} bind:selected/>
