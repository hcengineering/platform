<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { DateRangeMode, type Timestamp } from '@hcengineering/core'
  import { DatePresenter, getDaysDifference, getDueDateIconModifier } from '@hcengineering/ui'
  import type { ComponentProps } from 'svelte'

  type $$Props = ComponentProps<DatePresenter> & {
    onChange: (value: Timestamp | null) => void
  }

  export let { value, onChange, shouldIgnoreOverdue, ...rest } = $$props as $$Props

  let dueDateIconModifier: $$Props['iconModifier'] = undefined
  $: {
    const now = new Date()
    const dueDate = value === null || value === undefined ? null : new Date(value)
    const isOverdue = dueDate !== null && dueDate < now
    const daysDifference = dueDate === null ? null : getDaysDifference(now, dueDate)
    dueDateIconModifier = getDueDateIconModifier(isOverdue, daysDifference, shouldIgnoreOverdue ?? false)
  }
</script>

<DatePresenter
  {...rest}
  {value}
  {shouldIgnoreOverdue}
  iconModifier={dueDateIconModifier}
  mode={DateRangeMode.DATETIME}
  width="max-content"
  on:change={(e) => {
    const timestamp = e.detail ?? null
    value = timestamp
    onChange(timestamp)
  }}
/>
