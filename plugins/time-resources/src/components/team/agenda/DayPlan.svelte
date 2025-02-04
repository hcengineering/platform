<script lang="ts">
  import { Event } from '@hcengineering/calendar'
  import { IdMap, Ref, Timestamp } from '@hcengineering/core'
  import { IntlString, getEmbeddedLabel } from '@hcengineering/platform'
  import { ToDo, WorkSlot } from '@hcengineering/time'
  import { Label, Scroller, areDatesEqual, ticker } from '@hcengineering/ui'
  import time from '../../../plugin'
  import PlanGroup from './PlanGroup.svelte'

  export let day: Date
  export let slots: WorkSlot[]
  export let events: Event[]
  export let showAssignee: boolean = false
  export let todos: IdMap<ToDo>

  function getTitle (day: Date, now: Timestamp): IntlString {
    const today = new Date(now)
    const tomorrow = new Date(new Date(now).setDate(new Date(now).getDate() + 1))
    const yesterday = new Date(new Date(now).setDate(new Date(now).getDate() - 1))
    if (areDatesEqual(day, today)) return time.string.Today
    if (areDatesEqual(day, yesterday)) return time.string.Yesterday
    if (areDatesEqual(day, tomorrow)) return time.string.Tomorrow
    const isCurrentYear = day.getFullYear() === new Date().getFullYear()
    return getEmbeddedLabel(
      day.toLocaleDateString('default', {
        month: 'long',
        day: 'numeric',
        year: isCurrentYear ? undefined : 'numeric'
      })
    )
  }

  $: title = getTitle(day, $ticker)
</script>

<div class="caption-color text-xl p-4">
  <Label label={title} />
</div>

<Scroller padding={'0 1rem'} noStretch shrink>
  <PlanGroup {slots} {events} {showAssignee} {todos} />
</Scroller>
<div class="antiVSpacer x4" />
