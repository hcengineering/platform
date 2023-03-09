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
  import { Employee } from '@hcengineering/contact'
  import { Doc, Ref } from '@hcengineering/core'
  import type { Request, RequestType, Staff } from '@hcengineering/hr'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, Label, Loading, Scroller, tableSP } from '@hcengineering/ui'
  import view, { BuildModelKey, Viewlet, ViewletPreference } from '@hcengineering/view'
  import { getViewOptions, setActiveViewletId, Table, ViewletSettingButton } from '@hcengineering/view-resources'
  import hr from '../../plugin'
  import {
    EmployeeReports,
    getEndDate,
    getMonth,
    getRequestDates,
    getRequests,
    getStartDate,
    getTotal,
    tableToCSV,
    weekDays
  } from '../../utils'
  import StatPresenter from './StatPresenter.svelte'
  import ReportPresenter from './ReportPresenter.svelte'

  export let currentDate: Date = new Date()

  export let departmentStaff: Staff[]
  export let types: Map<Ref<RequestType>, RequestType>

  export let employeeRequests: Map<Ref<Staff>, Request[]>
  export let timeReports: Map<Ref<Employee>, EmployeeReports>
  export let holidays: Date[] | undefined = undefined

  $: month = getStartDate(currentDate.getFullYear(), currentDate.getMonth()) // getMonth(currentDate, currentDate.getMonth())
  $: wDays = weekDays(month.getFullYear(), month.getMonth())

  function getDateRange (request: Request): string {
    const ds = getRequestDates(request, types, month.getFullYear(), month.getMonth(), holidays)
    return ds.join(' ')
  }

  function getStatRequests (employee: Ref<Staff>, date: Date): Request[] {
    const endDate = getEndDate(date.getFullYear(), date.getMonth())

    return getRequests(employeeRequests, date, endDate, employee)
  }

  function getTypeVals (month: Date): Map<string, BuildModelKey> {
    return new Map(
      Array.from(types.values()).map((it) => [
        it.label as string,
        {
          key: '',
          label: it.label,
          presenter: StatPresenter,
          props: {
            month: month ?? getStartDate(currentDate.getFullYear(), currentDate.getMonth()),
            display: (req: Request[]) =>
              req
                .filter((r) => r.type === it._id)
                .map((it) => getDateRange(it))
                .join(' '),
            getStatRequests
          }
        }
      ])
    )
  }

  function getOverrideConfig (startDate: Date): Map<string, BuildModelKey> {
    const typevals = getTypeVals(startDate)
    const endDate = getEndDate(startDate.getFullYear(), startDate.getMonth())

    const getReport = (id: Ref<Doc>): EmployeeReports => {
      return timeReports.get(id as Ref<Employee>) ?? { value: 0, reports: [], tasks: new Map() }
    }
    const getTPD = (id: Ref<Doc>): number => {
      const rr = getReport(id)
      if (rr.value === 0) {
        return 0
      }
      return rr.tasks.size / rr.value
    }

    return new Map<string, BuildModelKey>([
      [
        '@wdCount',
        {
          key: '',
          label: getEmbeddedLabel('Working days'),
          presenter: StatPresenter,
          props: {
            month: startDate ?? getStartDate(currentDate.getFullYear(), currentDate.getMonth()),
            display: (req: Request[]) => wDays + getTotal(req, startDate, endDate, types, holidays),
            getStatRequests
          },
          sortingKey: '@wdCount',
          sortingFunction: (a: Doc, b: Doc) =>
            getTotal(getStatRequests(b._id as Ref<Staff>, startDate), startDate, endDate, types, holidays) -
            getTotal(getStatRequests(a._id as Ref<Staff>, startDate), startDate, endDate, types, holidays)
        }
      ],
      [
        '@wdCountReported',
        {
          key: '',
          label: getEmbeddedLabel('Reported days'),
          presenter: ReportPresenter,
          props: {
            month: startDate ?? getStartDate(currentDate.getFullYear(), currentDate.getMonth()),
            display: (staff: Staff) => getReport(staff._id).value
          },
          sortingKey: '@wdCountReported',
          sortingFunction: (a: Doc, b: Doc) => getReport(b._id).value - getReport(a._id).value
        }
      ],
      [
        '@wdTaskCountReported',
        {
          key: '',
          label: getEmbeddedLabel('Tasks'),
          presenter: ReportPresenter,
          props: {
            month: startDate ?? getStartDate(currentDate.getFullYear(), currentDate.getMonth()),
            display: (staff: Staff) => getReport(staff._id).tasks.size
          },
          sortingKey: '@wdTaskCountReported',
          sortingFunction: (a: Doc, b: Doc) => getReport(b._id).tasks.size - getReport(a._id).tasks.size
        }
      ],
      [
        '@wdTaskPerDayReported',
        {
          key: '',
          label: getEmbeddedLabel('TPD'),
          presenter: ReportPresenter,
          props: {
            month: startDate ?? getStartDate(currentDate.getFullYear(), currentDate.getMonth()),
            display: (staff: Staff) => getTPD(staff._id)
          },
          sortingKey: '@wdTaskPerDayReported',
          sortingFunction: (a: Doc, b: Doc) => getTPD(b._id) - getTPD(a._id)
        }
      ],
      [
        '@ptoCount',
        {
          key: '',
          label: getEmbeddedLabel('PTOs'),
          presenter: StatPresenter,
          props: {
            month: startDate ?? getMonth(currentDate, currentDate.getMonth()),
            display: (req: Request[]) =>
              getTotal(req, startDate, endDate, types, holidays, (a) => (a < 0 ? Math.abs(a) : 0)),
            getStatRequests
          },
          sortingKey: '@ptoCount',
          sortingFunction: (a: Doc, b: Doc) =>
            getTotal(getStatRequests(b._id as Ref<Staff>, startDate), startDate, endDate, types, holidays, (a) =>
              a < 0 ? Math.abs(a) : 0
            ) -
            getTotal(getStatRequests(a._id as Ref<Staff>, startDate), startDate, endDate, types, holidays, (a) =>
              a < 0 ? Math.abs(a) : 0
            )
        }
      ],
      [
        '@extraCount',
        {
          key: '',
          label: getEmbeddedLabel('EXTRa'),
          presenter: StatPresenter,
          props: {
            month: startDate ?? getMonth(currentDate, currentDate.getMonth()),
            display: (req: Request[]) =>
              getTotal(req, startDate, endDate, types, holidays, (a) => (a > 0 ? Math.abs(a) : 0)),
            getStatRequests
          },
          sortingKey: '@extraCount',
          sortingFunction: (a: Doc, b: Doc) =>
            getTotal(getStatRequests(b._id as Ref<Staff>, startDate), startDate, endDate, types, holidays, (a) =>
              a > 0 ? Math.abs(a) : 0
            ) -
            getTotal(getStatRequests(a._id as Ref<Staff>, startDate), startDate, endDate, types, holidays, (a) =>
              a > 0 ? Math.abs(a) : 0
            )
        }
      ],
      ...typevals
    ])
  }

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined
  let descr: Viewlet | undefined

  $: updateDescriptor(hr.viewlet.StaffStats)

  const client = getClient()

  let loading = false

  function updateDescriptor (id: Ref<Viewlet>) {
    loading = true
    client
      .findOne<Viewlet>(view.class.Viewlet, {
        _id: id
      })
      .then((res) => {
        descr = res
        if (res !== undefined) {
          setActiveViewletId(res._id)
          preferenceQuery.query(
            view.class.ViewletPreference,
            {
              attachedTo: res._id
            },
            (res) => {
              preference = res[0]
              loading = false
            },
            { limit: 1 }
          )
        }
      })
  }

  function createConfig (
    descr: Viewlet,
    preference: ViewletPreference | undefined,
    month: Date
  ): (string | BuildModelKey)[] {
    const base = preference?.config ?? descr.config
    const result: (string | BuildModelKey)[] = []
    const overrideConfig = getOverrideConfig(month)

    for (const key of [...base, ...overrideConfig.values()]) {
      if (typeof key === 'string') {
        result.push(overrideConfig.get(key) ?? key)
      } else {
        result.push(overrideConfig.get(key.key) ?? key)
      }
    }
    return result
  }

  $: viewOptions = getViewOptions(descr)
</script>

{#if departmentStaff.length}
  <Scroller fade={tableSP}>
    <div class="p-2">
      {#if descr}
        {#if loading}
          <Loading />
        {:else}
          <div class="flex-row-center flex-reverse">
            <div class="ml-1">
              <ViewletSettingButton bind:viewOptions viewlet={descr} />
            </div>
            <Button
              label={getEmbeddedLabel('Export')}
              size={'small'}
              on:click={() => {
                // Download it
                const filename = 'exportStaff' + new Date().toLocaleDateString() + '.csv'
                const link = document.createElement('a')
                link.style.display = 'none'
                link.setAttribute('target', '_blank')
                link.setAttribute(
                  'href',
                  'data:text/csv;charset=utf-8,%EF%BB%BF' + encodeURIComponent(tableToCSV('exportableData'))
                )
                link.setAttribute('download', filename)
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }}
            />
          </div>
          <Table
            tableId={'exportableData'}
            _class={hr.mixin.Staff}
            query={{ _id: { $in: departmentStaff.map((it) => it._id) } }}
            config={createConfig(descr, preference, month)}
            options={descr.options}
          />
        {/if}
      {/if}
    </div>
  </Scroller>
{:else}
  <div class="flex-center h-full w-full flex-grow fs-title">
    <Label label={hr.string.NoEmployeesInDepartment} />
  </div>
{/if}
