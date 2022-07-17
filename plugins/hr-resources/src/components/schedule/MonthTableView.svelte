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
  import { FindOptions, Ref } from '@anticrm/core'
  import type { Request, RequestType, Staff } from '@anticrm/hr'
  import { getEmbeddedLabel } from '@anticrm/platform'
  import { Label, Scroller } from '@anticrm/ui'
  import { Table } from '@anticrm/view-resources'
  import hr from '../../plugin'
  import { getMonth, getTotal, weekDays } from '../../utils'
  import NumberPresenter from './StatPresenter.svelte'

  export let currentDate: Date = new Date()

  export let startDate: number
  export let endDate: number

  export let departmentStaff: Staff[]
  export let types: Map<Ref<RequestType>, RequestType>

  export let employeeRequests: Map<Ref<Staff>, Request[]>

  $: month = getMonth(currentDate, currentDate.getMonth())
  $: wDays = weekDays(month.getUTCFullYear(), month.getUTCMonth())

  const options: FindOptions<Staff> = {
    lookup: {
      department: hr.class.Department
    }
  }

  function getDateRange (req: Request): string {
    const st = new Date(req.date).getDate()
    let days = Math.abs((req.dueDate - req.date) / 1000 / 60 / 60 / 24)
    if (days === 0) {
      days = 1
    }
    const stDate = new Date(req.date)
    let ds = Array.from(Array(days).keys()).map((it) => st + it)
    const type = types.get(req.type)
    if ((type?.value ?? -1) < 0) {
      ds = ds.filter((it) => ![0, 6].includes(new Date(stDate.setDate(it)).getDay()))
    }
    return ds.join(' ')
  }

  $: typevals = Array.from(
    Array.from(types.values()).map((it) => ({
      key: '',
      label: it.label,
      presenter: NumberPresenter,
      props: {
        month: month ?? getMonth(currentDate, currentDate.getMonth()),
        employeeRequests,
        display: (req: Request[]) =>
          req
            .filter((r) => r.type === it._id)
            .map((it) => getDateRange(it))
            .join(' ')
      }
    }))
  )

  $: config = [
    '',
    '$lookup.department',
    {
      key: '',
      label: getEmbeddedLabel('Working days'),
      presenter: NumberPresenter,
      props: {
        month: month ?? getMonth(currentDate, currentDate.getMonth()),
        employeeRequests,
        display: (req: Request[]) => wDays + getTotal(req, types)
      }
    },
    {
      key: '',
      label: getEmbeddedLabel('PTOs'),
      presenter: NumberPresenter,
      props: {
        month: month ?? getMonth(currentDate, currentDate.getMonth()),
        employeeRequests,
        display: (req: Request[]) => getTotal(req, types, (a) => (a < 0 ? Math.abs(a) : 0))
      }
    },
    {
      key: '',
      label: getEmbeddedLabel('EXTRa'),
      presenter: NumberPresenter,
      props: {
        month: month ?? getMonth(currentDate, currentDate.getMonth()),
        employeeRequests,
        display: (req: Request[]) => getTotal(req, types, (a) => (a > 0 ? Math.abs(a) : 0))
      }
    },
    ...(typevals ?? [])
  ]
</script>

{#if departmentStaff.length}
  <Scroller tableFade>
    <div class="p-2">
      <Table
        tableId={'exportableData'}
        _class={hr.mixin.Staff}
        query={{ _id: { $in: departmentStaff.map((it) => it._id) } }}
        {config}
        {options}
      />
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
