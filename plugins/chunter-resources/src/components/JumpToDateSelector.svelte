<script lang="ts">
  import { Timestamp, TypeDate } from '@anticrm/core'
  import { DateEditor } from '@anticrm/view-resources'
  import { createEventDispatcher } from 'svelte'

  export let selectedDate: Timestamp

  const type = { withTime: false } as TypeDate
  const dispatch = createEventDispatcher()
</script>

<div class="flex justify-center">
  <div class="dateEditor">
    <DateEditor
      value={selectedDate}
      {type}
      onChange={(v) => {
        dispatch('jumpToDate', { date: v })
      }}
    />
  </div>
</div>

<style lang="scss">
  .dateEditor {
    width: fit-content;
  }
</style>
