<script lang="ts">
  import { ActionIcon, IconAdd, showPopup, ModernEditbox } from '@hcengineering/ui'
  import { SortingOrder, getCurrentAccount } from '@hcengineering/core'
  import { PersonAccount } from '@hcengineering/contact'
  import { ToDoPriority } from '@hcengineering/time'
  import { getClient } from '@hcengineering/presentation'
  import CreateToDoPopup from './CreateToDoPopup.svelte'
  import time from '../plugin'
  import { makeRank } from '@hcengineering/task'

  export let fullSize: boolean = false
  let value: string = ''

  const client = getClient()
  const acc = getCurrentAccount() as PersonAccount

  async function save (): Promise<void> {
    let [name, description] = value.split('//')
    name = name.trim()
    if (name.length === 0) return
    description = description?.trim() ?? ''
    const ops = client.apply('todo')
    const latestTodo = await ops.findOne(
      time.class.ToDo,
      {
        user: acc.person,
        doneOn: null
      },
      {
        sort: { rank: SortingOrder.Ascending }
      }
    )
    await ops.addCollection(time.class.ToDo, time.space.ToDos, time.ids.NotAttached, time.class.ToDo, 'todos', {
      title: name,
      description,
      user: acc.person,
      workslots: 0,
      priority: ToDoPriority.NoPriority,
      visibility: 'private',
      rank: makeRank(undefined, latestTodo?.rank)
    })
    await ops.commit()
    clear()
  }

  function clear () {
    value = ''
  }

  function openPopup () {
    showPopup(CreateToDoPopup, {}, 'top')
  }
</script>

<div class="flex-row-center flex-gap-1 container" on:blur={clear}>
  <ModernEditbox
    label={time.string.CreateToDo}
    width={fullSize ? '100%' : ''}
    size={'medium'}
    autoAction={false}
    bind:value
    on:keydown={(e) => {
      if (e.key === 'Enter') {
        save()
        e.preventDefault()
        e.stopPropagation()
      }
    }}
  >
    <ActionIcon icon={IconAdd} action={openPopup} size={'small'} />
  </ModernEditbox>
</div>

<style lang="scss">
  .container {
    padding: var(--spacing-2) var(--spacing-2) var(--spacing-2_5);
    min-height: calc(4.75rem + 0.5px);
    border-bottom: 1px solid var(--theme-divider-color);
  }
</style>
