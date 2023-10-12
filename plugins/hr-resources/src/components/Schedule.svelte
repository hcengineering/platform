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
  import { Employee, PersonAccount } from '@hcengineering/contact'
  import { employeeByIdStore } from '@hcengineering/contact-resources'
  import { DocumentQuery, getCurrentAccount, Ref } from '@hcengineering/core'
  import { Department, Staff } from '@hcengineering/hr'
  import { createQuery } from '@hcengineering/presentation'
  import type { TabItem } from '@hcengineering/ui'
  import {
    Button,
    IconBack,
    IconForward,
    Label,
    SearchEdit,
    TabList,
    workbenchSeparators,
    defineSeparators,
    Separator
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  import hr from '../plugin'

  import ScheduleView from './ScheduleView.svelte'
  import Sidebar from './sidebar/Sidebar.svelte'

  export let visibileNav = true

  const accountEmployee = $employeeByIdStore.get((getCurrentAccount() as PersonAccount).person as Ref<Employee>)
  let accountStaff: Staff | undefined

  const accountStaffQ = createQuery()

  let department = accountStaff !== undefined ? accountStaff.department : hr.ids.Head
  $: if (accountEmployee !== undefined) {
    accountStaffQ.query(hr.mixin.Staff, { _id: accountEmployee._id as Ref<Staff> }, (res) => {
      accountStaff = res[0]
      department = accountStaff !== undefined ? accountStaff.department : hr.ids.Head
    })
  }

  let currentDate: Date = new Date()

  let search = ''
  let resultQuery: DocumentQuery<Staff> = {}

  function updateResultQuery (search: string): void {
    resultQuery = search === '' ? {} : { name: { $like: '%' + search + '%' } }
  }

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

  const handleSelect = (result: any) => {
    if (result.type === 'select') {
      const res = result.detail
      if (res.id === 'ModeMonth') mode = CalendarMode.Month
      else if (res.id === 'ModeYear') mode = CalendarMode.Year
    }
  }

  function departmentSelected (selected: Ref<Department>): void {
    department = selected
  }

  const viewslist: TabItem[] = [
    { id: 'chart', icon: view.icon.Views },
    { id: 'stats', icon: view.icon.Table }
  ]

  defineSeparators('workbench', workbenchSeparators)
</script>

<div class="flex h-full">
  {#if visibileNav}
    <Sidebar
      {department}
      {descendants}
      departmentById={departments}
      on:selected={(e) => departmentSelected(e.detail)}
    />
    <Separator name={'workbench'} disabledWhen={['panel-aside']} index={0} color={'var(--theme-navpanel-border)'} />
  {/if}

  <div class="antiPanel-component filled">
    <div class="ac-header full divide caption-height">
      <div class="ac-header__wrap-title mr-3">
        <span class="ac-header__title"><Label label={hr.string.Schedule} /></span>
      </div>

      <div class="ac-header-full medium-gap mb-1">
        {#if mode === CalendarMode.Month}
          <TabList
            items={viewslist}
            multiselect={false}
            selected={display}
            on:select={(result) => {
              if (result.detail !== undefined) display = result.detail.id
            }}
          />
        {/if}
      </div>
    </div>
    <div class="ac-header full divide search-start">
      <div class="ac-header-full small-gap">
        <SearchEdit bind:value={search} on:change={() => updateResultQuery(search)} />
        <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
      </div>
      <div class="ac-header-full medium-gap">
        <!-- <ViewletSettingButton bind:viewOptions {viewlet} /> -->
        <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
      </div>
    </div>
    <div class="ac-header full divide">
      <div class="ac-header-full small-gap">
        <Button
          icon={IconBack}
          kind={'ghost'}
          on:click={() => {
            inc(-1)
          }}
        />
        <Button
          label={calendar.string.Today}
          kind={'ghost'}
          on:click={() => {
            currentDate = new Date()
          }}
        />
        <Button
          icon={IconForward}
          kind={'ghost'}
          on:click={() => {
            inc(1)
          }}
        />
        <div class="buttons-divider" />
        <div class="fs-title flex-row-center flex-grow firstLetter">
          {#if mode === CalendarMode.Month}
            <span class="mr-2 overflow-label">{getMonthName(currentDate)}</span>
          {/if}
          {currentDate.getFullYear()}
        </div>
      </div>
      <TabList
        items={[
          { id: 'ModeMonth', labelIntl: calendar.string.ModeMonth },
          { id: 'ModeYear', labelIntl: calendar.string.ModeYear }
        ]}
        multiselect={false}
        on:select={handleSelect}
      />
    </div>

    <ScheduleView
      {department}
      {descendants}
      departmentById={departments}
      staffQuery={resultQuery}
      {currentDate}
      {mode}
      {display}
    />
  </div>
</div>
