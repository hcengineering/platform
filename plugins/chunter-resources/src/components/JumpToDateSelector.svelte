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

<div id={fixed ? '' : time?.toString()} class="flex-center clear-mins dateSelector">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    bind:this={div}
    class="border-radius-4 over-underline dateSelectorButton clear-mins"
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
      {new Date(time).toLocaleDateString('default', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: isCurrentYear ? undefined : 'numeric'
      })}
    {/if}
  </div>
</div>

<style lang="scss">
  .dateSelector {
    position: relative;
    flex-shrink: 0;
    margin: 0.25rem 0;

    &:not(:first-child)::after {
      position: absolute;
      content: '';
      top: 50%;
      left: 0;
      width: 100%;
      height: 1px;
      background-color: var(--theme-divider-color);
    }
    .dateSelectorButton {
      padding: 0.25rem 0.5rem;
      height: max-content;
      background-color: var(--theme-list-row-color);
      border: 1px solid var(--theme-divider-color);
      z-index: 10;
    }
  }
</style>
