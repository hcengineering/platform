<script lang="ts">
  import calendar, { Event } from '@hcengineering/calendar'
  import { DateRangeMode } from '@hcengineering/core'
  import { Icon } from '@hcengineering/ui'
  import DatePresenter from '@hcengineering/ui/src/components/calendar/DatePresenter.svelte'
  import ArrowRight from '@hcengineering/ui/src/components/icons/ArrowRight.svelte'
  import TimePresenter from '../../presenters/TimePresenter.svelte'

  export let item: Event
  export let showTime = false

  $: dueTime = item.dueDate - item.date
</script>

<div class="item flex-between">
  <div class="flex-col">
    <div class="flex-row-center">
      <Icon icon={calendar.icon.Calendar} size={'medium'} />
      <span class="ml-1 select-text">
        {item.title}
      </span>
    </div>
    {#if showTime}
      <div class="flex-col ml-4 mt-2">
        <div class="flex-row-center">
          <DatePresenter mode={DateRangeMode.TIMEONLY} value={item.date} />
          <div class="p-1">
            <Icon icon={ArrowRight} size={'small'} />
          </div>
          <DatePresenter mode={DateRangeMode.TIMEONLY} value={item.dueDate} />
        </div>
      </div>
    {/if}
  </div>
  <div class="flex-row-center whitespace-nowra flex-gap-4 flex-no-shrink ml-4">
    <TimePresenter value={dueTime} />
  </div>
</div>

<style lang="scss">
  .item {
    margin: 0.25rem 1rem 0.25rem 1rem;
  }
</style>
