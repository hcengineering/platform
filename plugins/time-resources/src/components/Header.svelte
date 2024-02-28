<script lang="ts">
  import calendar from '@hcengineering/calendar'
  import { Timestamp } from '@hcengineering/core'
  import { IntlString, getEmbeddedLabel } from '@hcengineering/platform'
  import { Button, IconBack, IconForward, Label, areDatesEqual, ticker } from '@hcengineering/ui'

  export let currentDate: Date = new Date()

  function inc (val: number): void {
    if (val === 0) {
      currentDate = new Date()
      return
    }
    currentDate.setDate(currentDate.getDate() + val)
    currentDate = currentDate
  }

  function getTitle (day: Date, now: Timestamp): IntlString {
    // const today = new Date(now)
    // const tomorrow = new Date(new Date(now).setDate(new Date(now).getDate() + 1))
    // const yesterday = new Date(new Date(now).setDate(new Date(now).getDate() - 1))
    // if (areDatesEqual(day, today)) return time.string.Today
    // if (areDatesEqual(day, yesterday)) return time.string.Yesterday
    // if (areDatesEqual(day, tomorrow)) return time.string.Tomorrow
    const isCurrentYear = day.getFullYear() === new Date().getFullYear()
    return getEmbeddedLabel(
      day.toLocaleDateString('default', {
        month: 'long',
        day: 'numeric',
        year: isCurrentYear ? undefined : 'numeric'
      })
    )
  }

  $: isToday = areDatesEqual(currentDate, new Date($ticker))
</script>

<div class="flex-between header-container bottom-divider flex-reverse">
  <div class="my-1 flex-row-center">
    <slot />
    <div class="date">
      <Label label={getTitle(currentDate, $ticker)} />
    </div>
    <Button
      icon={IconBack}
      kind={'ghost'}
      on:click={() => {
        inc(-1)
      }}
    />
    <div class="antiHSpacer x2" />
    <Button
      icon={IconForward}
      kind={'ghost'}
      on:click={() => {
        inc(1)
      }}
    />
    <div class="antiHSpacer x4" />
    <Button
      label={calendar.string.Today}
      disabled={isToday}
      kind={isToday ? 'primary' : 'regular'}
      on:click={() => {
        inc(0)
      }}
    />
  </div>
</div>

<style lang="scss">
  .header-container {
    flex-shrink: 0;
    padding: 0.5rem 2rem;
  }
  .date {
    color: var(--theme-caption-color);
    font-size: 1.25rem;
    margin-right: 1rem;
  }
</style>
