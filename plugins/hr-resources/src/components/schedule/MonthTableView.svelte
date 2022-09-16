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
  import { Doc, Ref } from '@anticrm/core'
  import type { Request, RequestType, Staff } from '@anticrm/hr'
  import { getEmbeddedLabel } from '@anticrm/platform'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Button, Label, Loading, Scroller, tableSP } from '@anticrm/ui'
  import view, { BuildModelKey, Viewlet, ViewletPreference } from '@anticrm/view'
  import { Table, ViewletSettingButton } from '@anticrm/view-resources'
  import hr from '../../plugin'
  import { fromTzDate, getMonth, getRequestDays, getTotal, tableToCSV, weekDays } from '../../utils'
  import NumberPresenter from './StatPresenter.svelte'

  export let currentDate: Date = new Date()

  export let departmentStaff: Staff[]
  export let types: Map<Ref<RequestType>, RequestType>

  export let employeeRequests: Map<Ref<Staff>, Request[]>

  $: month = getMonth(currentDate, currentDate.getMonth())
  $: wDays = weekDays(month.getUTCFullYear(), month.getUTCMonth())

  function getDateRange (request: Request): string {
    const ds = getRequestDays(request, types, month.getMonth())
    return ds.join(' ')
  }

  function getEndDate (date: Date): number {
    return new Date(date).setMonth(date.getMonth() + 1)
  }

  function getRequests (employee: Ref<Staff>, date: Date): Request[] {
    const requests = employeeRequests.get(employee)
    if (requests === undefined) return []
    const res: Request[] = []
    const time = date.getTime()
    const endTime = getEndDate(date)
    for (const request of requests) {
      if (fromTzDate(request.tzDate) <= endTime && fromTzDate(request.tzDueDate) > time) {
        res.push(request)
      }
    }
    return res
  }

  function getTypeVals (month: Date): Map<string, BuildModelKey> {
    return new Map(
      Array.from(types.values()).map((it) => [
        it.label as string,
        {
          key: '',
          label: it.label,
          presenter: NumberPresenter,
          props: {
            month: month ?? getMonth(currentDate, currentDate.getMonth()),
            display: (req: Request[]) =>
              req
                .filter((r) => r.type === it._id)
                .map((it) => getDateRange(it))
                .join(' '),
            getRequests
          }
        }
      ])
    )
  }

  function getOverrideConfig (month: Date): Map<string, BuildModelKey> {
    const typevals = getTypeVals(month)
    return new Map<string, BuildModelKey>([
      [
        '@wdCount',
        {
          key: '',
          label: getEmbeddedLabel('Working days'),
          presenter: NumberPresenter,
          props: {
            month: month ?? getMonth(currentDate, currentDate.getMonth()),
            display: (req: Request[]) => wDays + getTotal(req, month.getMonth(), types),
            getRequests
          },
          sortingKey: '@wdCount',
          sortingFunction: (a: Doc, b: Doc) =>
            getTotal(getRequests(b._id as Ref<Staff>, month), month.getMonth(), types) -
            getTotal(getRequests(a._id as Ref<Staff>, month), month.getMonth(), types)
        }
      ],
      [
        '@ptoCount',
        {
          key: '',
          label: getEmbeddedLabel('PTOs'),
          presenter: NumberPresenter,
          props: {
            month: month ?? getMonth(currentDate, currentDate.getMonth()),
            display: (req: Request[]) => getTotal(req, month.getMonth(), types, (a) => (a < 0 ? Math.abs(a) : 0)),
            getRequests
          },
          sortingKey: '@ptoCount',
          sortingFunction: (a: Doc, b: Doc) =>
            getTotal(getRequests(b._id as Ref<Staff>, month), month.getMonth(), types, (a) =>
              a < 0 ? Math.abs(a) : 0
            ) -
            getTotal(getRequests(a._id as Ref<Staff>, month), month.getMonth(), types, (a) => (a < 0 ? Math.abs(a) : 0))
        }
      ],
      [
        '@extraCount',
        {
          key: '',
          label: getEmbeddedLabel('EXTRa'),
          presenter: NumberPresenter,
          props: {
            month: month ?? getMonth(currentDate, currentDate.getMonth()),
            display: (req: Request[]) => getTotal(req, month.getMonth(), types, (a) => (a > 0 ? Math.abs(a) : 0)),
            getRequests
          },
          sortingKey: '@extraCount',
          sortingFunction: (a: Doc, b: Doc) =>
            getTotal(getRequests(b._id as Ref<Staff>, month), month.getMonth(), types, (a) =>
              a > 0 ? Math.abs(a) : 0
            ) -
            getTotal(getRequests(a._id as Ref<Staff>, month), month.getMonth(), types, (a) => (a > 0 ? Math.abs(a) : 0))
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
              <ViewletSettingButton viewlet={descr} />
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

<style lang="scss">
  table {
    position: relative;
    width: 100%;

    td,
    th {
      width: auto;
      width: 2rem;
      min-width: 1.5rem;
      border: none;
      &.fixed {
        width: 5rem;
        padding: 0 0.125rem;
        hyphens: auto;
      }
      &:first-child {
        width: 15rem;
        padding: 0.5rem;
      }
    }
    th {
      flex-shrink: 0;
      padding: 0;
      height: 2.5rem;
      min-height: 2.5rem;
      max-height: 2.5rem;
      text-transform: uppercase;
      font-weight: 500;
      font-size: 0.75rem;
      line-height: 105%;
      color: var(--dark-color);
      box-shadow: inset 0 -1px 0 0 var(--divider-color);
      user-select: none;
      cursor: pointer;

      span {
        display: block;
        font-weight: 600;
        font-size: 1rem;
      }
      &.today {
        color: var(--caption-color);
      }
      &.weekend:not(.today) {
        color: var(--warning-color);
      }
    }
    td {
      height: 3.5rem;
      border: none;
      color: var(--caption-color);
      &.today {
        background-color: var(--theme-bg-accent-hover);
      }
      &.weekend:not(.today) {
        background-color: var(--theme-bg-accent-color);
      }
    }
    td:not(:last-child) {
      border-right: 1px solid var(--divider-color);
    }
    tr:not(.scroller-thead__tr) {
      border-bottom: 1px solid var(--divider-color);
    }
    tr.scroller-thead__tr:not(:last-child) {
      border-right: 1px solid var(--divider-color);
    }

    .hovered {
      position: relative;

      &::after {
        position: absolute;
        content: '';
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: var(--caption-color);
        opacity: 0.15;
      }
    }
  }
</style>
