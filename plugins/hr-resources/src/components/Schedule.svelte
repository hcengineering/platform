<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { CalendarMode } from '@hcengineering/calendar-resources'
  import calendar from '@hcengineering/calendar-resources/src/plugin'
  import { Ref } from '@hcengineering/core'
  import { Department } from '@hcengineering/hr'
  import { createQuery, SpaceSelector } from '@hcengineering/presentation'
  import {
    Button,
    Icon,
    IconBack,
    IconForward,
    Label,
    deviceOptionsStore as deviceInfo,
    TabList
  } from '@hcengineering/ui'
  import type { TabItem } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import hr from '../plugin'
  import ScheduleMonthView from './ScheduleView.svelte'

  let department = hr.ids.Head
  let currentDate: Date = new Date()

  const query = createQuery()

  let descendants: Map<Ref<Department>, Department[]> = new Map<Ref<Department>, Department[]>()
  let departments: Map<Ref<Department>, Department> = new Map<Ref<Department>, Department>()

  let mode: CalendarMode = CalendarMode.Month
  let display: 'chart' | 'stats' = 'chart'

  query.query(hr.class.Department, {}, (res) => {
    departments.clear()
    descendants.clear()
    for (const doc of res) {
      const current = descendants.get(doc.space) ?? []
      current.push(doc)
      descendants.set(doc.space, current)
      departments.set(doc._id, doc)
    }
    departments = departments
    descendants = descendants
  })

  function inc (val: number): void {
    switch (mode) {
      case CalendarMode.Month: {
        currentDate.setMonth(currentDate.getMonth() + val)
        break
      }
      case CalendarMode.Year: {
        currentDate.setFullYear(currentDate.getFullYear() + val)
        break
      }
    }
    currentDate = currentDate
  }

  function getMonthName (date: Date): string {
    return new Intl.DateTimeFormat('default', {
      month: 'long'
    }).format(date)
  }

  $: twoRows = $deviceInfo.twoRows
  const handleSelect = (result: any) => {
    if (result.type === 'select') {
      const res = result.detail
      if (res.id === 'ModeMonth') mode = CalendarMode.Month
      else if (res.id === 'ModeYear') mode = CalendarMode.Year
    }
  }

  const viewslist: TabItem[] = [
    { id: 'chart', icon: view.icon.Views },
    { id: 'stats', icon: view.icon.Table }
  ]
</script>

<div class="ac-header divide {twoRows ? 'flex-col-reverse' : 'full'} withSettings">
  <div class="ac-header__wrap-title" class:mt-2={twoRows}>
    {#if !twoRows}
      <div class="ac-header__icon"><Icon icon={calendar.icon.Calendar} size={'small'} /></div>
      <span class="ac-header__title"><Label label={hr.string.Schedule} /></span>
    {:else}
      <div class="fs-title mr-4 flex-row-center flex-grow firstLetter">
        {#if mode === CalendarMode.Month}
          <span class="mr-2 overflow-label">{getMonthName(currentDate)}</span>
        {/if}
        {currentDate.getFullYear()}
      </div>
    {/if}
    <div class="flex-row-center gap-2 flex-no-shrink" class:ml-6={!twoRows}>
      <TabList
        items={[
          { id: 'ModeMonth', labelIntl: calendar.string.ModeMonth },
          { id: 'ModeYear', labelIntl: calendar.string.ModeYear }
        ]}
        multiselect={false}
        size={'small'}
        on:select={handleSelect}
      />
      <div class="buttons-divider" />
      <Button
        icon={IconBack}
        size={'small'}
        kind={'link-bordered'}
        on:click={() => {
          inc(-1)
        }}
      />
      <Button
        size={'small'}
        label={calendar.string.Today}
        kind={'link-bordered'}
        on:click={() => {
          currentDate = new Date()
        }}
      />
      <Button
        icon={IconForward}
        size={'small'}
        kind={'link-bordered'}
        on:click={() => {
          inc(1)
        }}
      />
    </div>
    {#if !twoRows}
      <div class="fs-title ml-4 flex-row-center firstLetter">
        {#if mode === CalendarMode.Month}
          <span class="overflow-label mr-2">{getMonthName(currentDate)}</span>
        {/if}
        {currentDate.getFullYear()}
      </div>
    {/if}
  </div>

  <div class="ac-header__wrap-title {twoRows ? 'mt-1' : 'ml-4'}">
    {#if twoRows}
      <div class="ac-header__icon flex-center"><Icon icon={calendar.icon.Calendar} size={'small'} /></div>
      <span class="ac-header__title" class:flex-grow={twoRows}><Label label={hr.string.Schedule} /></span>
    {/if}
    <div class="flex-row-center gap-2">
      {#if mode === CalendarMode.Month}
        <TabList
          items={viewslist}
          multiselect={false}
          selected={display}
          kind={'secondary'}
          size={'small'}
          on:select={(result) => {
            if (result.detail !== undefined) display = result.detail.id
          }}
        />
      {/if}
      <SpaceSelector
        _class={hr.class.Department}
        label={hr.string.Department}
        bind:space={department}
        kind={'secondary'}
      />
    </div>
  </div>
</div>

<ScheduleMonthView {department} {descendants} departmentById={departments} {currentDate} {mode} {display} />
