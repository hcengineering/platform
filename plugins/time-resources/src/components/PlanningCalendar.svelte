<script lang="ts">
  import calendar, { Calendar, Event, generateEventId, getAllEvents } from '@hcengineering/calendar'
  import { DayCalendar, calendarByIdStore, hidePrivateEvents } from '@hcengineering/calendar-resources'
  import { PersonAccount } from '@hcengineering/contact'
  import { Ref, SortingOrder, Timestamp, getCurrentAccount } from '@hcengineering/core'
  import { IntlString, getEmbeddedLabel } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import {
    AnyComponent,
    ButtonBase,
    ButtonIcon,
    IconChevronLeft,
    IconChevronRight,
    Label,
    areDatesEqual,
    showPopup,
    ticker,
    Header,
    getFormattedDate,
    resizeObserver,
    deviceOptionsStore as deviceInfo
  } from '@hcengineering/ui'
  import { ToDo, WorkSlot } from '@hcengineering/time'
  import time from '../plugin'
  import IconSun from './icons/Sun.svelte'

  export let dragItem: ToDo | null = null
  export let currentDate: Date = new Date()
  export let displayedDaysCount = 1
  export let element: HTMLElement | undefined = undefined
  export let createComponent: AnyComponent | undefined = calendar.component.CreateEvent

  const q = createQuery()

  function getFrom (date: Date): Timestamp {
    return new Date(date).setHours(0, 0, 0, 0)
  }

  function getTo (date: Date, days: number = 3): Timestamp {
    return new Date(date).setDate(date.getDate() + days)
  }

  let dayCalendar: DayCalendar
  let raw: Event[] = []
  let objects: Event[] = []
  let showLabel: boolean = true

  const rem = (n: number): number => n * $deviceInfo.fontSize

  const acc = getCurrentAccount()._id

  const calendarsQ = createQuery()

  let calendars: Calendar[] = []
  let todayDate = new Date()

  $: calendarsQ.query(calendar.class.Calendar, { createdBy: acc, hidden: false }, (res) => {
    calendars = res
  })

  $: from = getFrom(currentDate)
  $: to = getTo(currentDate, displayedDaysCount)

  function update (calendars: Calendar[]): void {
    q.query<Event>(
      calendar.class.Event,
      { calendar: { $in: calendars.map((p) => p._id) } },
      (result) => {
        raw = result
      },
      { sort: { date: SortingOrder.Ascending } }
    )
  }

  $: update(calendars)
  $: all = getAllEvents(raw, from, to)
  $: objects = hidePrivateEvents(all, $calendarByIdStore)

  function inc (val: number): void {
    if (val === 0) {
      currentDate = new Date()
      dayCalendar.scrollToTime(currentDate)
      return
    }
    currentDate.setDate(currentDate.getDate() + val)
    currentDate = currentDate
  }

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

  const dragItemId = 'drag_item' as Ref<WorkSlot>
  function dragEnter (e: CustomEvent<any>) {
    if (dragItem != null) {
      const current = raw.find((p) => p._id === dragItemId)
      if (current !== undefined) {
        current.attachedTo = dragItem._id
        current.attachedToClass = dragItem._class
        current.date = e.detail.date.getTime()
        current.dueDate = new Date(e.detail.date).setMinutes(new Date(e.detail.date).getMinutes() + 30)
      } else {
        const me = getCurrentAccount() as PersonAccount
        const _calendar = `${me._id}_calendar` as Ref<Calendar>
        const ev: WorkSlot = {
          _id: dragItemId,
          allDay: false,
          eventId: generateEventId(),
          title: '',
          description: '',
          isExternal: false,
          access: 'owner',
          attachedTo: dragItem._id,
          attachedToClass: dragItem._class,
          _class: time.class.WorkSlot,
          collection: 'events',
          visibility: 'public',
          calendar: _calendar,
          space: calendar.space.Calendar,
          modifiedBy: me._id,
          participants: [me.person],
          modifiedOn: Date.now(),
          date: e.detail.date.getTime(),
          dueDate: new Date(e.detail.date).setMinutes(new Date(e.detail.date).getMinutes() + 30)
        }
        raw.push(ev)
      }
      raw = raw
      all = getAllEvents(raw, from, to)
      objects = hidePrivateEvents(all, $calendarByIdStore)
    }
  }
  function dragLeave (event: DragEvent) {
    const rect = dayCalendar.getCalendarRect()
    if (!rect) return
    if (event.x < rect.left || event.x > rect.right || event.y < rect.top || event.y > rect.bottom) {
      raw = raw.filter((r) => r._id !== dragItemId)
    }
  }
  function dragOut () {
    if (dragItemId != null) {
      raw = raw.filter((r) => r._id !== dragItemId)
    }
  }

  function clear (dragItem: ToDo | null) {
    if (dragItem === null) {
      raw = raw.filter((p) => p._id !== dragItemId)
      all = getAllEvents(raw, from, to)
      objects = hidePrivateEvents(all, $calendarByIdStore)
    }
  }
  $: clear(dragItem)

  function showCreateDialog (date: Date, withTime: boolean) {
    if (createComponent === undefined) {
      return
    }
    showPopup(createComponent, { date, withTime }, 'top')
  }

  $: isToday = areDatesEqual(currentDate, new Date($ticker))
</script>

<div
  class="hulyComponent modal"
  bind:this={element}
  use:resizeObserver={(element) => {
    showLabel = showLabel ? element.clientWidth > rem(3.5) + 399 : element.clientWidth > rem(3.5) + 400
  }}
>
  <Header adaptive={'disabled'}>
    <div class="heading-medium-20 line-height-auto overflow-label">
      <Label label={time.string.Schedule} />: <Label label={getTitle(currentDate, $ticker)} />
    </div>
    <svelte:fragment slot="actions">
      <ButtonIcon
        icon={IconChevronLeft}
        kind={'secondary'}
        size={'small'}
        on:click={() => {
          inc(-1)
        }}
      />
      <ButtonBase
        icon={IconSun}
        label={showLabel ? time.string.TodayColon : undefined}
        title={showLabel ? getFormattedDate(todayDate.getTime(), { weekday: 'short', day: 'numeric' }) : undefined}
        type={showLabel ? 'type-button' : 'type-button-icon'}
        kind={'secondary'}
        size={'small'}
        inheritFont
        hasMenu
        disabled={isToday}
        on:click={() => {
          inc(0)
        }}
      />
      <ButtonIcon
        icon={IconChevronRight}
        kind={'secondary'}
        size={'small'}
        on:click={() => {
          inc(1)
        }}
      />
    </svelte:fragment>
  </Header>
  <div class="hulyComponent-content__container">
    <DayCalendar
      bind:this={dayCalendar}
      events={objects}
      bind:displayedDaysCount
      startFromWeekStart={false}
      clearCells={dragItem !== null}
      {dragItemId}
      on:dragEnter={dragEnter}
      on:dragOut={dragOut}
      on:dragleave={dragLeave}
      on:create={(e) => {
        showCreateDialog(e.detail.date, e.detail.withTime)
      }}
      on:dragDrop
      bind:currentDate
      bind:todayDate
    />
  </div>
</div>

<style lang="scss">
  .title {
    padding: 1.75rem 2rem;
    font-size: 1.25rem;
    color: var(--theme-caption-color);
  }

  .tools {
    padding: 0 2rem 0.75rem;
  }
</style>
