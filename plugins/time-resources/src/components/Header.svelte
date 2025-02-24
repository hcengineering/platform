<script lang="ts">
  import { Timestamp } from '@hcengineering/core'
  import { IntlString, getEmbeddedLabel } from '@hcengineering/platform'
  import {
    Label,
    areDatesEqual,
    ticker,
    Header,
    ButtonIcon,
    ButtonBase,
    IconChevronLeft,
    IconChevronRight,
    getFormattedDate
  } from '@hcengineering/ui'
  import IconSun from './icons/Sun.svelte'
  import time from '../plugin'

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

  const todayDate = new Date()
  $: isToday = areDatesEqual(currentDate, new Date($ticker))
</script>

<Header adaptive={'disabled'}>
  <div class="heading-medium-20 line-height-auto overflow-label pl-2">
    <Label label={getTitle(currentDate, $ticker)} />
  </div>

  <svelte:fragment slot="actions" let:doubleRow>
    <slot />
    <ButtonIcon
      icon={IconChevronLeft}
      kind={'secondary'}
      size={'small'}
      dataId={'btnPrev'}
      on:click={() => {
        inc(-1)
      }}
    />
    <ButtonBase
      icon={IconSun}
      label={!doubleRow ? time.string.TodayColon : undefined}
      title={!doubleRow ? getFormattedDate(todayDate.getTime(), { weekday: 'short', day: 'numeric' }) : undefined}
      type={!doubleRow ? 'type-button' : 'type-button-icon'}
      kind={'secondary'}
      size={'small'}
      dataId={'btnToday'}
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
      dataId={'btnNext'}
      on:click={() => {
        inc(1)
      }}
    />
  </svelte:fragment>
</Header>
