<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Label, Button, DateRangePresenter, CheckBox, Component } from '@anticrm/ui'
  import { Card, CardDate } from '@anticrm/board'
  import calendar from '@anticrm/calendar'
  import board from '../../plugin'
  import { getClient } from '@anticrm/presentation'

  export let object: Card

  const client = getClient()
  const dispatch = createEventDispatcher()

  let startDate = object.date?.startDate
  let savedStartDate = object.date?.startDate ?? Date.now()
  let startDateEnabled = startDate !== undefined
  $: startDate && (savedStartDate = startDate)
  let dueDate = object.date?.dueDate
  let savedDueDate = object.date?.dueDate ?? Date.now()
  let dueDateEnabled = dueDate !== undefined
  $: dueDate && (savedDueDate = dueDate)

  function update () {
    const date: CardDate = {}
    if (startDate !== undefined) date.startDate = startDate
    if (dueDate !== undefined) date.dueDate = dueDate
    client.update(object, { date })
  }
</script>

<div class="antiPopup antiPopup-withHeader antiPopup-withTitle antiPopup-withCategory w-85">
  <div class="ap-space" />
  <div class="fs-title ap-header flex-row-center">
    <Label label={board.string.Dates} />
  </div>
  <div class="ap-space bottom-divider" />
  <div class="ap-category">
    <div class="categoryItem flex-center whitespace-nowrap">
      <Label label={board.string.StartDate} />
    </div>
    <div class="categoryItem p-2 flex-center">
      <CheckBox
        bind:checked={startDateEnabled}
        on:value={() => {
          startDate = startDateEnabled ? savedStartDate : undefined
        }}
      />
    </div>
    <div class="categoryItem w-full p-2">
      <DateRangePresenter bind:value={startDate} editable={startDateEnabled} labelNull={board.string.NullDate} />
    </div>
  </div>
  <div class="ap-category">
    <div class="categoryItem flex-center whitespace-nowrap">
      <Label label={board.string.DueDate} />
    </div>
    <div class="categoryItem p-2 flex-center">
      <CheckBox
        bind:checked={dueDateEnabled}
        on:value={() => {
          dueDate = dueDateEnabled ? savedDueDate : undefined
        }}
      />
    </div>
    <div class="categoryItem w-full p-2">
      <DateRangePresenter bind:value={dueDate} editable={dueDateEnabled} labelNull={board.string.NullDate} />
    </div>
  </div>
  <div class="ap-footer">
    <Button
      size={'small'}
      label={board.string.Cancel}
      on:click={() => {
        dispatch('close')
      }}
    />
    <Button
      label={board.string.Remove}
      size={'small'}
      on:click={() => {
        client.update(object, { date: {} })
        dispatch('close')
      }}
    />
    <Button
      label={board.string.Save}
      size={'small'}
      kind={'primary'}
      on:click={() => {
        update()
        dispatch('close')
      }}
    />
    <div class="flex-center mr-2">
      <Component is={calendar.component.DocReminder} props={{ value: object }} />
    </div>
  </div>
</div>
