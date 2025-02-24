<script lang="ts">
  import { Event, getAllEvents } from '@hcengineering/calendar'
  import { IdMap, Ref } from '@hcengineering/core'
  import { Project } from '@hcengineering/task'
  import { ToDo, WorkSlot } from '@hcengineering/time'
  import Border from '../../Border.svelte'
  import Header from '../../Header.svelte'
  import WithTeamData from '../WithTeamData.svelte'
  import { toSlots } from '../utils'
  import DayPlan from './DayPlan.svelte'

  export let space: Ref<Project>
  export let currentDate: Date

  $: today = new Date(currentDate)
  $: yesterday = new Date(new Date(today).setDate(today.getDate() - 1))
  $: tomorrow = new Date(new Date(today).setDate(today.getDate() + 1))
  $: yesterdayFrom = new Date(yesterday).setHours(0, 0, 0, 0)
  $: yesterdayTo = new Date(today).setHours(0, 0, 0, 0)
  $: todayFrom = new Date(today).setHours(0, 0, 0, 0)
  $: todayTo = new Date(tomorrow).setHours(0, 0, 0, 0)

  let project: Project | undefined
  let slots: WorkSlot[] = []
  let events: Event[] = []
  let todos: IdMap<ToDo> = new Map()

  $: yesterdaySlots = toSlots(getAllEvents(slots, yesterdayFrom, yesterdayTo))
  $: yesterdayEvents = getAllEvents(events, yesterdayFrom, yesterdayTo)

  $: yesterdayEventsMap = new Map(yesterdayEvents.map((e) => [e._id, e]))

  $: todaySlots = toSlots(getAllEvents(slots, todayFrom, todayTo))
  $: todayEvents = getAllEvents(
    events.filter((it) => !yesterdayEventsMap.has(it._id)),
    todayFrom,
    todayTo
  )
</script>

<WithTeamData {space} fromDate={yesterdayFrom} toDate={todayTo} bind:project bind:todos bind:slots bind:events />

<Header bind:currentDate />
{#if project}
  <div class="flex-row-top background-body-color h-full">
    <div class="item flex-col">
      <DayPlan day={yesterday} slots={yesterdaySlots} events={yesterdayEvents} showAssignee {todos} />
    </div>
    <div class="flex-no-shrink">
      <Border />
    </div>
    <div class="item flex-col">
      <DayPlan day={today} slots={todaySlots} events={todayEvents} showAssignee {todos} />
    </div>
  </div>
{/if}

<style lang="scss">
  .item {
    flex-shrink: 0;
    flex-grow: 1;
    width: 50%;
    height: 100%;
    // margin: 2rem;
  }
</style>
