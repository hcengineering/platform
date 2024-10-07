<script lang="ts">
  import { translateCB } from '@hcengineering/platform'
  import { ToDo, WorkSlot } from '@hcengineering/time'
  import { areDatesEqual, themeStore } from '@hcengineering/ui'
  import timePlugin from '../plugin'
  import { getNearest } from '../utils'

  export let events: WorkSlot[]
  export let todo: ToDo

  $: overdue = !events.some((event) => event.dueDate >= Date.now())

  $: near = getNearest(events)

  function getText (todo: ToDo, near: WorkSlot | undefined): void {
    const today = new Date()
    const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1))
    if (todo.doneOn != null) {
      const day = new Date(todo.doneOn)
      if (areDatesEqual(day, today)) {
        translateCB(timePlugin.string.Today, {}, $themeStore.language, (res) => {
          str = res
        })
        return
      }
      if (areDatesEqual(day, yesterday)) {
        translateCB(timePlugin.string.Yesterday, {}, $themeStore.language, (res) => {
          str = res
        })
        return
      }
      if (areDatesEqual(day, tomorrow)) {
        translateCB(timePlugin.string.Tomorrow, {}, $themeStore.language, (res) => {
          str = res
        })
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
        translateCB(timePlugin.string.Today, {}, $themeStore.language, (res) => {
          str = `${res} ${time}`
        })
        return
      }
      if (areDatesEqual(day, yesterday)) {
        translateCB(timePlugin.string.Yesterday, {}, $themeStore.language, (res) => {
          str = `${res} ${time}`
        })
        return
      }
      if (areDatesEqual(day, tomorrow)) {
        translateCB(timePlugin.string.Tomorrow, {}, $themeStore.language, (res) => {
          str = `${res} ${time}`
        })
        return
      }
      return
    }
    translateCB(timePlugin.string.Inbox, {}, $themeStore.language, (res) => {
      str = res
    })
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
