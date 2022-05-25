<script lang="ts">
  import { Timestamp } from '@anticrm/core'
  import { DateRangePopup, showPopup } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import { getDay } from '../utils'

  export let selectedDate: Timestamp | undefined
  export let fixed: boolean = false

  let div: HTMLDivElement | undefined
  const dispatch = createEventDispatcher()

  $: time = selectedDate ? getDay(selectedDate) : undefined
</script>

<div id={fixed ? '' : time?.toString()} class="flex justify-center over-underline dateSelector">
  <div
    bind:this={div}
    on:click={() => {
      showPopup(DateRangePopup, {}, div, (v) => {
        if (v) {
          v.setHours(0, 0, 0, 0)
          dispatch('jumpToDate', { date: v.getTime() })
        }
      })
    }}
  >
    {#if time}
      <div>
        {new Date(time).toDateString()}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .dateSelector {
    &:not(:first-child) {
      border-top: 1px solid var(--theme-dialog-divider);
    }
  }
</style>
