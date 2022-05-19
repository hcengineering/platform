<script lang="ts">
  import { DatePresenter, Icon } from '@anticrm/ui'
  import board, { Card } from '@anticrm/board'
  import { createQuery } from '@anticrm/presentation'
  import task, { TodoItem } from '@anticrm/task'
  import { Ref } from '@anticrm/core'
  import { getDateIcon } from '../../utils/BoardUtils'

  export let value: Card
  export let size: 'small' | 'medium' | 'large' = 'small'

  const todoListQuery = createQuery()
  let todoLists: Ref<TodoItem>[]
  $: todoListQuery.query(task.class.TodoItem, { space: value.space, attachedTo: value._id }, (result) => {
    todoLists = result.map(({ _id }) => _id)
  })
  const query = createQuery()
  let done: number, total: number, item: TodoItem
  $: query.query(task.class.TodoItem, { space: value.space, attachedTo: { $in: todoLists } }, (result) => {
    total = result.total
    done = result.filter((t) => t.done).length
    item = result.reduce((min, cur) =>
      cur.dueTo === null ? min : min.dueTo === null || cur.dueTo < min.dueTo ? cur : min
    )
  })
</script>

{#if value && (total ?? 0) > 0}
  <div class="sm-tool-icon ml-1 mr-1">
    <Icon icon={board.icon.Card} {size} />
    &nbsp;{done}/{total}
    {#if item.dueTo !== null}
      &nbsp;<DatePresenter value={item.dueTo} size="small" icon={getDateIcon(item)} kind="transparent" />
    {/if}
  </div>
{/if}
