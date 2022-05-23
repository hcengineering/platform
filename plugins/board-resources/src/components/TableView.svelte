<script lang="ts">
  import { Card } from '@anticrm/board'
  import { Class, FindOptions, Ref } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import task, { SpaceWithStates, State } from '@anticrm/task'
  import { TableBrowser } from '@anticrm/view-resources'
  import board from '../plugin'

  export let _class: Ref<Class<Card>>
  export let space: Ref<SpaceWithStates>
  export let options: FindOptions<Card> | undefined

  const isArchived = { $nin: [true] }
  const query = createQuery()
  let states: Ref<State>[]
  $: query.query(task.class.State, { space, isArchived }, (result) => {
    states = result.map(({ _id }) => _id)
  })
</script>

<TableBrowser
  {_class}
  config={[
    'title',
    '$lookup.state',
    { key: '', presenter: board.component.CardLabels, label: board.string.Labels },
    'startDate',
    'dueDate',
    { key: 'members', presenter: board.component.UserBoxList, label: board.string.Members, sortingKey: '' },
    'modifiedOn'
  ]}
  {options}
  query={{ isArchived, state: { $in: states } }}
/>
