<script lang="ts">
  import { IntlString, translate } from '@anticrm/platform'
  import { createQuery } from '@anticrm/presentation'
  import { DropdownLabels } from '@anticrm/ui'
  import { Ref, SortingOrder } from '@anticrm/core'
  import { DropdownTextItem } from '@anticrm/ui/src/types'
  import { calcRank, State } from '@anticrm/task'
  import { Card } from '@anticrm/board'
  import board from '../../plugin'

  export let object: Card
  export let label: IntlString
  export let state: Ref<State>
  export let selected: string

  let ranks: DropdownTextItem[] = []
  const tasksQuery = createQuery()
  tasksQuery.query(
    board.class.Card,
    { state },
    async (result) => {
      ;[ranks] = [...result.filter((t) => t._id !== object._id), undefined].reduce<
        [DropdownTextItem[], Card | undefined]
      >(
        ([arr, prev], next) => [[...arr, { id: calcRank(prev, next), label: `${arr.length + 1}` }], next],
        [[], undefined]
      )
      ;[{ id: selected = object.rank }] = ranks.slice(-1)

      if (object.state === state) {
        const index = result.findIndex((t) => t._id === object._id)
        ranks[index] = {
          id: object.rank,
          label: await translate(board.string.Current, { label: ranks[index].label })
        }
        selected = object.rank
      }
    },
    { sort: { rank: SortingOrder.Ascending } }
  )
</script>

<DropdownLabels items={ranks} {label} bind:selected />
