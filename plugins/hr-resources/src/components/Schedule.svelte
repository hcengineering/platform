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
  import { onDestroy } from 'svelte'
  import { CalendarMode } from '@hcengineering/calendar-resources'
  import calendar from '@hcengineering/calendar-resources/src/plugin'
  import { DocumentQuery, Ref } from '@hcengineering/core'
  import { Department, Staff } from '@hcengineering/hr'
  import { createQuery } from '@hcengineering/presentation'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import type { TabItem, DropdownIntlItem } from '@hcengineering/ui'
  import {
    ModernButton,
    ButtonIcon,
    IconBack,
    IconForward,
    SearchInput,
    Separator,
    Header,
    Breadcrumb,
    Switcher,
    defineSeparators,
    twoPanelsSeparators,
    deviceOptionsStore as deviceInfo,
    tableToCSV,
    showPopup
  } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'

  import hr from '../plugin'

  import ScheduleView from './ScheduleView.svelte'
  import Sidebar from './sidebar/Sidebar.svelte'
  import ExportPopup from './schedule/ExportPopup.svelte'

  const me = getCurrentEmployee()
  let accountStaff: Staff | undefined

  const accountStaffQ = createQuery()

  let department = accountStaff !== undefined ? accountStaff.department : hr.ids.Head
  $: if (me !== undefined) {
    accountStaffQ.query(hr.mixin.Staff, { _id: me as Ref<Staff> }, (res) => {
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
      if (doc.parent !== undefined && doc._id !== hr.ids.Head) {
        const current = descendants.get(doc.parent) ?? []
        current.push(doc)
        descendants.set(doc.parent, current)
      }
      departments.set(doc._id, doc)
    }
    departments = departments
    descendants = descendants
  })

  function inc (val: number): void {
    switch (mode) {
      case CalendarMode.Month: {
        currentDate.setDate(1)
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

  let viewlet: Viewlet | undefined
  let preference: ViewletPreference | undefined
  let loading = false

  function exportTable (evt: Event) {
    interface ExportPopupItem extends DropdownIntlItem {
      separator: ',' | ';'
    }
    const items: ExportPopupItem[] = [
      {
        id: '0',
        label: getEmbeddedLabel(', (csv)'),
        separator: ','
      },
      {
        id: '1',
        label: getEmbeddedLabel('; (MS Excel)'),
        separator: ';'
      }
    ]
    showPopup(
      ExportPopup,
      {
        items
      },
      evt.target as HTMLElement,
      (res) => {
        if (res != null) {
          const filename = 'exportStaff' + new Date().toLocaleDateString() + '.csv'
          const link = document.createElement('a')
          link.style.display = 'none'
          link.setAttribute('target', '_blank')
          link.setAttribute(
            'href',
            'data:text/csv;charset=utf-8,%EF%BB%BF' +
              encodeURIComponent(tableToCSV('exportableData', items[res].separator))
          )
          link.setAttribute('download', filename)
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      }
    )
  }

  let replacedPanel: HTMLElement
  $: $deviceInfo.replacedPanel = replacedPanel
  onDestroy(() => ($deviceInfo.replacedPanel = undefined))

  defineSeparators('schedule', twoPanelsSeparators)
</script>

<div class="hulyPanels-container">
  {#if $deviceInfo.navigator.visible}
    <Sidebar
      {department}
      {descendants}
      departmentById={departments}
      on:selected={(e) => {
        departmentSelected(e.detail)
      }}
    />
    <Separator
      name={'schedule'}
      float={$deviceInfo.navigator.float}
      index={0}
      color={'transparent'}
      separatorSize={0}
      short
    />
  {/if}

  <div class="hulyComponent" bind:this={replacedPanel}>
    <Header
      adaptive={'disabled'}
      hideBefore={mode === CalendarMode.Year}
      hideActions={!(mode === CalendarMode.Month && display === 'stats')}
    >
      <svelte:fragment slot="beforeTitle">
        {#if mode === CalendarMode.Month}
          <Switcher
            name={'schedule-mode-view'}
            items={viewslist}
            kind={'subtle'}
            selected={display}
            on:select={(result) => {
              if (result.detail !== undefined) display = result.detail.id
            }}
          />
          {#if display === 'stats'}
            <ViewletSelector
              hidden
              bind:viewlet
              bind:preference
              bind:loading
              viewletQuery={{ _id: hr.viewlet.StaffStats }}
            />
            <ViewletSettingButton bind:viewlet />
          {/if}
        {/if}
      </svelte:fragment>

      <Breadcrumb icon={hr.icon.HR} label={hr.string.Schedule} size={'large'} isCurrent />

      <svelte:fragment slot="search">
        <SearchInput
          bind:value={search}
          collapsed
          on:change={() => {
            updateResultQuery(search)
          }}
        />
      </svelte:fragment>
      <svelte:fragment slot="actions">
        {#if mode === CalendarMode.Month && display === 'stats'}
          <ModernButton
            label={hr.string.Export}
            size={'small'}
            on:click={(evt) => {
              exportTable(evt)
            }}
          />
        {/if}
      </svelte:fragment>
    </Header>
    <div class="hulyHeader-container clearPadding justify-between flex-gap-4">
      <div class="flex-row-center flex-gap-2">
        <ButtonIcon
          icon={IconBack}
          kind={'tertiary'}
          size={'small'}
          on:click={() => {
            inc(-1)
          }}
        />
        <ModernButton
          label={calendar.string.Today}
          kind={'tertiary'}
          size={'small'}
          on:click={() => (currentDate = new Date())}
        />
        <ButtonIcon
          icon={IconForward}
          kind={'tertiary'}
          size={'small'}
          on:click={() => {
            inc(1)
          }}
        />
        <div class="hulyHeader-divider short" />
        <div class="fs-title flex-row-center flex-grow firstLetter">
          {#if mode === CalendarMode.Month}
            <span class="mr-2 overflow-label">{getMonthName(currentDate)}</span>
          {/if}
          {currentDate.getFullYear()}
        </div>
      </div>
      <Switcher
        name={'calendar-mode-view'}
        selected={mode === CalendarMode.Month ? 'ModeMonth' : 'ModeYear'}
        kind={'subtle'}
        items={[
          { id: 'ModeMonth', labelIntl: calendar.string.ModeMonth },
          { id: 'ModeYear', labelIntl: calendar.string.ModeYear }
        ]}
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
      {preference}
      {viewlet}
      {loading}
    />
  </div>
</div>
