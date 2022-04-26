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
  export let isCopying: boolean = false

  let ranks: DropdownTextItem[] = []
  const tasksQuery = createQuery()
  tasksQuery.query(
    board.class.Card,
    { state },
    async (result) => {
      const filteredResult = isCopying ? result : result.filter((t) => t._id !== object._id)

      ;[ranks] = [...filteredResult, undefined].reduce<[DropdownTextItem[], Card | undefined]>(
        ([arr, prev], next) => [[...arr, { id: calcRank(prev, next), label: `${arr.length + 1}` }], next],
        [[], undefined]
      )

      let selectedRank = ranks.slice(-1)[0].id

      if (object.state === state) {
        const index = result.findIndex((t) => t._id === object._id)

        if (index !== -1) {
          selectedRank = isCopying ? ranks[index].id : object.rank

          ranks[index] = {
            id: selectedRank,
            label: await translate(board.string.Current, { label: ranks[index].label })
          }
        }
      }

      selected = selectedRank
    },
    { sort: { rank: SortingOrder.Ascending } }
  )
</script>

<DropdownLabels items={ranks} {label} bind:selected />
