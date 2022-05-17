<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Label, Button, DateRangePresenter, CheckBox, Component } from '@anticrm/ui'
  import { Card, CardDate } from '@anticrm/board'
  import calendar from '@anticrm/calendar'
  import board from '../../plugin'
  import { getClient } from '@anticrm/presentation'

  export let value: Card

  const client = getClient()
  const dispatch = createEventDispatcher()

  let startDate = value.date?.startDate
  let savedStartDate = value.date?.startDate ?? Date.now()
  let startDateEnabled = startDate !== undefined
  $: startDate && (savedStartDate = startDate)
  let dueDate = value.date?.dueDate
  let savedDueDate = value.date?.dueDate ?? Date.now()
  let dueDateEnabled = dueDate !== undefined
  $: dueDate && (savedDueDate = dueDate)

  function getEmptyDate (): CardDate {
    return { _class: value.date?._class ?? board.class.CardDate }
  }

  function update () {
    const date: CardDate = getEmptyDate()
    if (startDate !== undefined) date.startDate = startDate
    if (dueDate !== undefined) date.dueDate = dueDate
    client.update(value, { date })
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
        client.update(value, { date: getEmptyDate() })
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
      <Component is={calendar.component.DocReminder} props={{ value }} />
    </div>
  </div>
</div>
