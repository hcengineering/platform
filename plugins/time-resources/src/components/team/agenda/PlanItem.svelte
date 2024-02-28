<script lang="ts">
  import calendarPlugin from '@hcengineering/calendar'
  import { Icon, Label } from '@hcengineering/ui'
  import { WorkSlotMapping } from '../../../types'
  import ToDoPresenter from '../../ToDoPresenter.svelte'
  import TimePresenter from '../../presenters/TimePresenter.svelte'
  import DatePresenter from '@hcengineering/ui/src/components/calendar/DatePresenter.svelte'
  import { DateRangeMode } from '@hcengineering/core'
  import ArrowRight from '@hcengineering/ui/src/components/icons/ArrowRight.svelte'

  export let item: WorkSlotMapping
  export let showAssignee: boolean = false
  export let showSlots = false

  $: dueTime = item.slots.reduce((it, itm) => it + (itm.dueDate - itm.date), 0)

  $: overlap = item.slots.reduce((it, itm) => it + (itm.overlap ?? 0), 0)
</script>

<div class="item flex-between items-baseline">
  <div class="flex-col ml-0-5">
    {#if item.todo !== undefined}
      <ToDoPresenter value={item.todo} showCheck />
    {:else}
      <div class="overflow-label flex-no-shrink">
        <Label label={calendarPlugin.string.Busy} />
      </div>
    {/if}
    {#if showSlots}
      <div class="flex-col ml-4 mt-2">
        {#each item.slots as slot}
          <div class="flex-row-center">
            <DatePresenter mode={DateRangeMode.TIMEONLY} value={slot.date} />
            <div class="p-1">
              <Icon icon={ArrowRight} size={'small'} />
            </div>
            <DatePresenter mode={DateRangeMode.TIMEONLY} value={slot.dueDate} />
          </div>
        {/each}
      </div>
    {/if}
  </div>
  <div class="flex-row-center whitespace-nowrap flex-no-shrink ml-4 no-word-wrap">
    <TimePresenter value={dueTime} />
    {#if overlap > 0}
      <div class="flex-row-center ml-1 text-sm no-word-wrap">
        (-<TimePresenter value={overlap} />)
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .item {
    margin: 0.25rem 1rem 0.25rem 1rem;
  }
</style>
