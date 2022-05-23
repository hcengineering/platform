<script lang="ts">
  import { Timestamp } from '@anticrm/core'
  import { DateRangePopup, Label, showPopup } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import chunter from '../plugin'

  export let selectedDate: Timestamp | undefined = undefined
  export let withBorder: boolean = true

  let div: HTMLDivElement | undefined
  const dispatch = createEventDispatcher()
</script>

<div id={selectedDate?.toString()} class="flex justify-center over-underline" class:border={withBorder}>
  <div
    bind:this={div}
    on:click={() => {
      showPopup(DateRangePopup, {}, div, (v) => {
        dispatch('jumpToDate', { date: v })
      })
    }}
  >
    {#if selectedDate}
      <div>
        {new Date(selectedDate).toLocaleString('default', {
          month: 'short',
          day: 'numeric',
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    {:else}
      <Label label={chunter.string.JumpToDate} />
    {/if}
  </div>
</div>

<style lang="scss">
  .border {
    border-top: 1px solid var(--theme-dialog-divider);
  }
</style>
