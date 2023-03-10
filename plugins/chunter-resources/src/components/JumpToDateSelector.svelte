<script lang="ts">
  import { Timestamp } from '@hcengineering/core'
  import { DateRangePopup, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getDay } from '../utils'

  export let selectedDate: Timestamp | undefined
  export let fixed: boolean = false

  let div: HTMLDivElement | undefined
  const dispatch = createEventDispatcher()

  $: time = selectedDate ? getDay(selectedDate) : undefined

  $: isCurrentYear = time ? new Date(time).getFullYear() === new Date().getFullYear() : undefined
</script>

<div id={fixed ? '' : time?.toString()} class="flex justify-center mt-5 pr-1 dateSelector">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    bind:this={div}
    class="mb-1 p-1 border-radius-2 over-underline dateSelectorButton"
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
        {new Date(time).toLocaleDateString('default', {
          weekday: 'short',
          month: 'long',
          day: 'numeric',
          year: isCurrentYear ? undefined : 'numeric'
        })}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .dateSelector {
    &:not(:first-child) {
      border-top: 1px solid var(--divider-color);
    }
  }

  .dateSelectorButton {
    margin-top: -1rem;
    background-color: var(--body-color);
    border: 1px solid var(--divider-color);
  }
</style>
