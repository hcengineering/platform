<script lang="ts">
  import { Timestamp } from '@anticrm/core'
  import { DateRangePopup, Label, showPopup } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import chunter from '../plugin'
  import { getDay } from '../utils'

  export let selectedDate: Timestamp

  let div: HTMLDivElement | undefined
  const dispatch = createEventDispatcher()

  $: time = getDay(selectedDate)
</script>

<div id={time?.toString()} class="flex justify-center over-underline border">
  <div
    bind:this={div}
    on:click={() => {
      showPopup(DateRangePopup, {}, div, (v) => {
        if (v) {
          v.setHours(0)
          v.setMinutes(0)
          v.setSeconds(0)
          v.setMilliseconds(0)
          dispatch('jumpToDate', { date: v.getTime() })
        }
      })
    }}
  >
    <div>
      {new Date(time).toDateString()}
    </div>
  </div>
</div>

<style lang="scss">
  .border {
    &:not(:first-child) {
      border-top: 1px solid var(--theme-dialog-divider);
    }
  }
</style>
