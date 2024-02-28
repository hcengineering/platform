<script lang="ts">
  import { translate } from '@hcengineering/platform'
  import { areDatesEqual } from '@hcengineering/ui'
  import { ToDo, WorkSlot } from '@hcengineering/time'
  import timePlugin from '../plugin'
  import { getNearest } from '../utils'

  export let events: WorkSlot[]
  export let todo: ToDo

  $: overdue = !events.some((event) => event.dueDate >= Date.now())

  $: near = getNearest(events)

  async function getText (todo: ToDo, near: WorkSlot | undefined): Promise<void> {
    const today = new Date()
    const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1))
    if (todo.doneOn != null) {
      const day = new Date(todo.doneOn)
      if (areDatesEqual(day, today)) {
        str = await translate(timePlugin.string.Today, {})
        return
      }
      if (areDatesEqual(day, yesterday)) {
        str = await translate(timePlugin.string.Yesterday, {})
        return
      }
      if (areDatesEqual(day, tomorrow)) {
        str = await translate(timePlugin.string.Tomorrow, {})
        return
      }
      str = new Date(todo.doneOn).toLocaleString('default', {
        day: '2-digit',
        month: 'short'
      })
      return
    }
    if (near !== undefined) {
      str = new Date(near.date).toLocaleString('default', {
        minute: '2-digit',
        hour: 'numeric',
        day: '2-digit',
        month: 'short'
      })
      const time = new Date(near.date).toLocaleString('default', {
        minute: '2-digit',
        hour: 'numeric'
      })
      const day = new Date(near.date)
      if (areDatesEqual(day, today)) {
        str = `${await translate(timePlugin.string.Today, {})} ${time}`
        return
      }
      if (areDatesEqual(day, yesterday)) {
        str = `${await translate(timePlugin.string.Yesterday, {})} ${time}`
        return
      }
      if (areDatesEqual(day, tomorrow)) {
        str = `${await translate(timePlugin.string.Tomorrow, {})} ${time}`
        return
      }
      return
    }
    str = await translate(timePlugin.string.Inbox, {})
  }

  let str = ''

  $: getText(todo, near)
</script>

<div
  class="container"
  class:overdue
  class:done={todo.doneOn != null}
  class:inbox={events.length === 0 && todo.doneOn == null}
>
  {str}
</div>

<style lang="scss">
  .container {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: nowrap;
    padding: 0.125rem 0.5rem;
    white-space: nowrap;
    font-size: 0.75rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-navpanel-selected);
    border-radius: 0.25rem;

    &.overdue {
      background-color: var(--highlight-red-press);
    }

    &.done {
      background-color: var(--theme-won-color);
    }

    &.inbox {
      background-color: var(--secondary-button-hovered);
    }
  }
</style>
