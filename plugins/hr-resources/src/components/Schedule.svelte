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
  import { CalendarMode } from '@anticrm/calendar-resources'
  import calendar from '@anticrm/calendar-resources/src/plugin'
  import { Ref } from '@anticrm/core'
  import { Department } from '@anticrm/hr'
  import { getEmbeddedLabel } from '@anticrm/platform'
  import { createQuery, SpaceSelector } from '@anticrm/presentation'
  import { Button, Icon, IconBack, IconForward, Label } from '@anticrm/ui'
  import view from '@anticrm/view'
  import hr from '../plugin'
  import { tableToCSV } from '../utils'
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
</script>

<div class="ac-header full divide">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={calendar.icon.Calendar} size={'small'} /></div>
    <span class="ac-header__title"><Label label={hr.string.Schedule} /></span>
    <div class="flex gap-2 ml-6">
      <Button
        size={'small'}
        label={calendar.string.ModeMonth}
        on:click={() => {
          mode = CalendarMode.Month
        }}
      />
      <Button
        size={'small'}
        label={calendar.string.ModeYear}
        on:click={() => {
          mode = CalendarMode.Year
        }}
      />
      <div class="flex ml-4 gap-2">
        <Button
          icon={IconBack}
          size={'small'}
          on:click={() => {
            inc(-1)
          }}
        />
        <Button
          size={'small'}
          label={calendar.string.Today}
          on:click={() => {
            currentDate = new Date()
          }}
        />
        <Button
          icon={IconForward}
          size={'small'}
          on:click={() => {
            inc(1)
          }}
        />
      </div>
    </div>
    <div class="fs-title ml-4 flex-row-center">
      {#if mode === CalendarMode.Month}
        {getMonthName(currentDate)}
      {/if}
      {currentDate.getFullYear()}
    </div>
  </div>

  {#if mode === CalendarMode.Month}
    <div class="flex ml-4 gap-2">
      <Button
        icon={view.icon.Views}
        selected={display === 'chart'}
        size={'small'}
        on:click={() => {
          display = 'chart'
        }}
      />
      <Button
        size={'small'}
        icon={view.icon.Table}
        selected={display === 'stats'}
        on:click={() => {
          display = 'stats'
        }}
      />
    </div>
    {#if display === 'stats'}
      <Button
        label={getEmbeddedLabel('Export')}
        on:click={() => {
          // Download it
          const filename = 'exportStaff' + new Date().toLocaleDateString() + '.csv'
          const link = document.createElement('a')
          link.style.display = 'none'
          link.setAttribute('target', '_blank')
          link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(tableToCSV('exportableData')))
          link.setAttribute('download', filename)
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }}
      />
    {/if}
  {/if}

  <SpaceSelector _class={hr.class.Department} label={hr.string.Department} bind:space={department} />
</div>

<ScheduleMonthView {department} {descendants} departmentById={departments} {currentDate} {mode} {display} />
