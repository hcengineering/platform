<!--
// Copyright © 2023 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { RecurringRule, getWeekday } from '@hcengineering/calendar'
  import ui, {
    Button,
    CircleButton,
    DropdownIntlItem,
    DropdownLabelsIntl,
    Grid,
    Label,
    NumberInput,
    RadioButton
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'
  import DateEditor from './DateEditor.svelte'

  export let rules: RecurringRule[]

  type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  let periodType: Freq = (rules[0]?.freq as Freq) ?? 'WEEKLY'
  let interval: number = rules[0]?.interval ?? 1

  const dispatch = createEventDispatcher()

  let selected = rules[0]?.endDate !== undefined ? 'on' : rules[0]?.count ? 'after' : 'never'

  const ddItems = [
    {
      id: 'DAILY',
      label: calendar.string.Day
    },
    {
      id: 'WEEKLY',
      label: calendar.string.Week
    },
    {
      id: 'MONTHLY',
      label: calendar.string.Month
    },
    {
      id: 'YEARLY',
      label: calendar.string.Year
    }
  ] as DropdownIntlItem[]

  function save () {
    const res: RecurringRule = {
      freq: periodType,
      interval
    }
    if (selected === 'on') {
      res.endDate = until
    } else if (selected === 'after') {
      res.count = count
    }
    if (periodType === 'WEEKLY') {
      res.byDay = selectedWeekdays
    }
    rules = [res]
    dispatch('close', rules)
  }

  let count: number = rules[0]?.count ?? 1

  let selectedWeekdays: string[] = rules[0]?.byDay ?? [getWeekday(new Date())]

  function weekdayClick (day: string) {
    const index = selectedWeekdays.findIndex((p) => p === day)
    if (index !== -1) {
      selectedWeekdays.splice(index, 1)
    } else {
      selectedWeekdays.push(day)
    }
    selectedWeekdays = selectedWeekdays
  }

  function isActive (day: string, selected: string[]): boolean {
    return selectedWeekdays.includes(day)
  }

  const weekdays = [
    { id: 'MO', label: calendar.string.MondayShort },
    { id: 'TU', label: calendar.string.TuesdayShort },
    { id: 'WE', label: calendar.string.WednesdayShort },
    { id: 'TH', label: calendar.string.ThursdayShort },
    { id: 'FR', label: calendar.string.FridayShort },
    { id: 'SA', label: calendar.string.SaturdayShort },
    { id: 'SU', label: calendar.string.SundayShort }
  ]

  let until: number = rules[0]?.endDate ?? Date.now()
</script>

<div class="container">
  <div class="header fs-title">
    <Label label={calendar.string.Repeat} />
    {selected}
  </div>
  <div class="content">
    <div class="flex-row-center flex-gap-2">
      <Label label={calendar.string.Every} />
      <NumberInput bind:value={interval} maxWidth={'3rem'} maxDigitsAfterPoint={0} minValue={1} />
      <DropdownLabelsIntl bind:selected={periodType} items={ddItems} size="medium" params={{ count: interval }} />
    </div>
    {#if periodType === 'WEEKLY'}
      <div class="flex-row-center mt-4">
        <Label label={calendar.string.On} />
        <div class="flex-row-center flex-gap-2 ml-6">
          {#each weekdays as day}
            <CircleButton
              size="medium"
              accented={isActive(day.id, selectedWeekdays)}
              on:click={() => weekdayClick(day.id)}
            >
              <div class="flex-row-center weekday" slot="content">
                <Label label={day.label} />
              </div>
            </CircleButton>
          {/each}
        </div>
      </div>
    {/if}
    <div class="mt-4 mb-6">
      <Label label={calendar.string.Ends} />
    </div>
    <Grid columnGap={1} rowGap={1}>
      <RadioButton
        labelIntl={calendar.string.Never}
        value={'never'}
        group={selected}
        action={() => {
          selected = 'never'
        }}
      />
      <div />
      <RadioButton
        labelIntl={calendar.string.OnUntil}
        value={'on'}
        group={selected}
        action={() => {
          selected = 'on'
        }}
      />
      <div class="flex">
        <DateEditor bind:date={until} withoutTime kind="regular" disabled={selected !== 'on'} />
      </div>
      <RadioButton
        labelIntl={calendar.string.After}
        value={'after'}
        group={selected}
        action={() => {
          selected = 'after'
        }}
      />
      <div class="flex-row-center flex-gap-2">
        <NumberInput
          bind:value={count}
          maxWidth={'3rem'}
          maxDigitsAfterPoint={0}
          minValue={1}
          disabled={selected !== 'after'}
        />
        <Label label={calendar.string.Times} params={{ count }} />
      </div>
    </Grid>
  </div>
  <div class="pool flex-row-reverse flex-gap-3">
    <Button
      label={ui.string.Save}
      on:click={save}
      kind="accented"
      disabled={periodType === 'MONTHLY' && selectedWeekdays.length === 0}
    />
    <Button label={ui.string.Cancel} on:click={() => dispatch('close')} />
  </div>
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--theme-popup-color);
    box-shadow: var(--theme-popup-shadow);
    width: 25rem;
    border-radius: 1rem;

    .header {
      margin: 1.25rem;
      margin-bottom: 0;
    }

    .content {
      margin: 1.25rem;
    }

    .weekday {
      overflow: hidden;
      font-size: 0.75rem;
    }

    .pool {
      border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
      padding: 1.25rem;
    }
  }
</style>
