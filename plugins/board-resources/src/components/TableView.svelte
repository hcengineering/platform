<script lang="ts">
  import { Card } from '@hcengineering/board'
  import { Class, FindOptions, Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import task, { SpaceWithStates, State } from '@hcengineering/task'
  import tags from '@hcengineering/tags'
  import { TableBrowser } from '@hcengineering/view-resources'
  import board from '../plugin'

  export let _class: Ref<Class<Card>>
  export let space: Ref<SpaceWithStates>
  export let options: FindOptions<Card> | undefined

  const isArchived = { $nin: [true] }
  const query = createQuery()
  let states: Ref<State>[] = []
  $: query.query(task.class.State, { space, isArchived }, (result) => {
    states = result.map(({ _id }) => _id)
  })
</script>

<TableBrowser
  {_class}
  config={[
    'title',
    'status',
    {
      key: '',
      presenter: tags.component.TagsPresenter,
      label: board.string.Labels,
      sortingKey: 'labels',
      props: {
        _class: board.class.Card,
        key: 'labels'
      }
    },
    'startDate',
    'dueDate',
    { key: 'members', presenter: board.component.UserBoxList, label: board.string.Members, sortingKey: 'members' },
    'modifiedOn'
  ]}
  {options}
  query={{ isArchived, status: { $in: states } }}
/>
