<script lang="ts">
  import { Card } from '@anticrm/board'
  import calendar from '@anticrm/calendar'
  import { DocumentUpdate } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { Label, Button, DateRangePresenter, Component } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  import board from '../../plugin'

  export let value: Card

  const client = getClient()
  const dispatch = createEventDispatcher()

  let startDate = value.startDate
  let dueDate = value.dueDate

  function update () {
    const date: DocumentUpdate<Card> = {}
    if (startDate !== undefined) date.startDate = startDate
    if (dueDate !== undefined) date.dueDate = dueDate
    client.update(value, date)
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
    <div class="categoryItem w-full p-2">
      <DateRangePresenter bind:value={startDate} editable={true} labelNull={board.string.NullDate} />
    </div>
  </div>
  <div class="ap-category">
    <div class="categoryItem flex-center whitespace-nowrap">
      <Label label={board.string.DueDate} />
    </div>
    <div class="categoryItem w-full p-2">
      <DateRangePresenter bind:value={dueDate} editable={true} labelNull={board.string.NullDate} />
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
        client.update(value, { startDate: null, dueDate: null })
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
