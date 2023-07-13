<script lang="ts">
  import { Card } from '@hcengineering/board'
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { calcRank, State } from '@hcengineering/task'
  import { DropdownLabels, DropdownTextItem, themeStore } from '@hcengineering/ui'
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
    { status: state, isArchived: { $nin: [true] } },
    async (result) => {
      const filteredResult = isCopying ? result : result.filter((t) => t._id !== object._id)

      ;[ranks] = [...filteredResult, undefined].reduce<[DropdownTextItem[], Card | undefined]>(
        ([arr, prev], next) => [[...arr, { id: calcRank(prev, next), label: `${arr.length + 1}` }], next],
        [[], undefined]
      )

      let selectedRank = ranks.slice(-1)[0].id

      if (object.status === state) {
        const index = result.findIndex((t) => t._id === object._id)

        if (index !== -1) {
          selectedRank = isCopying ? ranks[index].id : object.rank

          ranks[index] = {
            id: selectedRank,
            label: await translate(board.string.Current, { label: ranks[index].label }, $themeStore.language)
          }
        }
      }

      selected = selectedRank
    },
    { sort: { rank: SortingOrder.Ascending } }
  )
</script>

<DropdownLabels items={ranks} {label} bind:selected />
