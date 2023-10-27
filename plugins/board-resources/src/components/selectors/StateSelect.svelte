<script lang="ts">
  import { Card } from '@hcengineering/board'
  import core, { Ref, SortingOrder, Space, Status } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { DropdownLabels, DropdownTextItem, themeStore } from '@hcengineering/ui'
  import board from '../../plugin'
  import task, { Project } from '@hcengineering/task'

  export let object: Card
  export let label: IntlString
  export let selected: Ref<Status>
  export let space: Ref<Space>

  let _space: Project | undefined

  let states: DropdownTextItem[] = []
  const spaceQuery = createQuery()
  spaceQuery.query(
    task.class.Project,
    {
      _id: space as Ref<Project>
    },
    (result) => {
      _space = result[0]
    }
  )

  const statesQuery = createQuery()
  statesQuery.query(
    core.class.Status,
    {
      space: _space?.type
    },
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
