<script lang="ts">
  import { AccessLevel, Calendar, getPrimaryCalendar, PrimaryCalendar } from '@hcengineering/calendar'
  import { getCurrentAccount, Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Dropdown, Icon } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'

  export let value: Ref<Calendar> | undefined
  export let disabled: boolean = false
  export let focusIndex = -1
  export let withIcon: boolean = true

  const dispatch = createEventDispatcher()

  let calendars: Calendar[] = []
  let preference: PrimaryCalendar | undefined = undefined
  const me = getCurrentAccount()
  const q = createQuery()
  const prefQ = createQuery()

  let prefsLoaded = false
  let calendarsLoaded = false

  q.query(
    calendar.class.Calendar,
    { user: me.primarySocialId, hidden: false, access: { $in: [AccessLevel.Owner, AccessLevel.Writer] } },
    (res) => {
      calendarsLoaded = true
      calendars = res
      setCalendar(calendars, preference)
    }
  )

  prefQ.query(calendar.class.PrimaryCalendar, {}, (res) => {
    prefsLoaded = true
    preference = res[0]
    setCalendar(calendars, preference)
  })

  function setCalendar (calendars: Calendar[], primary: PrimaryCalendar | undefined): void {
    if (value) return
    if (!calendarsLoaded || !prefsLoaded) return
    const target = getPrimaryCalendar(calendars, primary, getCurrentAccount().uuid)
    change(target)
  }

  $: items = calendars.map((p) => {
    return {
      _id: p._id,
      label: p.name
    }
  })

  $: selected = value !== undefined ? items.find((p) => p._id === value) : undefined

  function change (id: Ref<Calendar>) {
    if (value !== id) {
      dispatch('change', { _id: id })
      value = id
    }
  }
</script>

{#if calendars.length > 0}
  <div class="flex-row-center flex-gap-1">
    {#if withIcon}
      <Icon icon={calendar.icon.Calendar} size={'small'} />
    {/if}
    <Dropdown
      kind={'ghost'}
      size={'medium'}
      placeholder={calendar.string.Calendar}
      {items}
      withSearch={false}
      {selected}
      {disabled}
      {focusIndex}
      on:selected={(e) => {
        change(e.detail._id)
      }}
    />
  </div>
{/if}
