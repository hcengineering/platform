<script lang="ts">
  import { Card } from '@hcengineering/board'
  import { Ref, SortingOrder, Space } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import task, { State } from '@hcengineering/task'
  import { DropdownLabels, DropdownTextItem, themeStore } from '@hcengineering/ui'
  import board from '../../plugin'

  export let object: Card
  export let label: IntlString
  export let selected: Ref<State>
  export let space: Ref<Space>

  let states: DropdownTextItem[] = []
  const statesQuery = createQuery()
  statesQuery.query(
    task.class.State,
    { space, isArchived: { $nin: [true] } },
    async (result) => {
      if (!result) return
      states = result.map(({ _id, name }) => ({ id: _id, label: name }))
      ;[{ _id: selected }] = result
      if (object.space === space) {
        const index = states.findIndex(({ id }) => id === object.status)
        states[index].label = await translate(
          board.string.Current,
          { label: states[index].label },
          $themeStore.language
        )
        selected = object.status
      }
    },
    { sort: { rank: SortingOrder.Ascending } }
  )
</script>

<DropdownLabels items={states} {label} bind:selected />
