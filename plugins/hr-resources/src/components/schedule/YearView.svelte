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
  import { EmployeePresenter } from '@hcengineering/contact-resources'
  import contact from '@hcengineering/contact-resources/src/plugin'
  import { Ref } from '@hcengineering/core'
  import type { Request, RequestType, Staff } from '@hcengineering/hr'
  import { Label, LabelAndProps, Scroller, tableHRscheduleY, tooltip } from '@hcengineering/ui'
  import hr from '../../plugin'
  import {
    getHolidayDatesForEmployee,
    getEndDate,
    getRequests,
    getStartDate,
    getTotal,
    isToday,
    weekDays
  } from '../../utils'
  import RequestsPopup from '../RequestsPopup.svelte'
  import { Department } from '@hcengineering/hr'

  export let currentDate: Date = new Date()

  export let departmentStaff: Staff[]
  export let types: Map<Ref<RequestType>, RequestType>

  export let employeeRequests: Map<Ref<Staff>, Request[]>

  export let holidays: Map<Ref<Department>, Date[]>
  export let staffDepartmentMap: Map<Ref<Staff>, Department[]>

  function getTooltip (requests: Request[]): LabelAndProps | undefined {
    if (requests.length === 0) return
    return {
      component: RequestsPopup,
      props: { requests: requests.map((it) => it._id) }
    }
  }

  $: values = [...Array(12).keys()]

  function getMonthName (date: Date): string {
    return new Intl.DateTimeFormat('default', { month: 'long' }).format(date)
  }

  let hoveredIndex: number = -1
</script>

{#if departmentStaff.length}
  <Scroller fade={tableHRscheduleY} horizontal>
    <table>
      <thead class="scroller-thead">
        <tr class="scroller-thead__tr">
          <th>
            <Label label={contact.string.Employee} />
          </th>
          {#each values as value, i}
            {@const startDate = getStartDate(currentDate.getFullYear(), value)}
            <th
              class="fixed first-row"
              class:today={isToday(startDate)}
              on:mousemove={() => {
                hoveredIndex = i
              }}
              on:mouseleave={() => {
                hoveredIndex = -1
              }}
            >
              {getMonthName(startDate)}
            </th>
          {/each}
        </tr>
        <tr>
          <th class="fixed last-row">
            <span class="flex-center">
              {departmentStaff.length}
            </span>
          </th>
          {#each values as value, i}
            {@const startDate = getStartDate(currentDate.getFullYear(), value)}
            <th class="fixed last-row" class:today={isToday(startDate)}>
              <span class="flex-center">
                {weekDays(startDate.getFullYear(), startDate.getMonth())}
              </span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each departmentStaff as employee, row}
          <tr class="tr-body">
            <td class="td-body">
              <EmployeePresenter value={employee} />
            </td>
            {#each values as value, i}
              {@const startDate = getStartDate(currentDate.getFullYear(), value)}
              {@const endDate = getEndDate(currentDate.getFullYear(), value)}
              {@const requests = getRequests(employeeRequests, startDate, endDate, employee._id)}
              {@const tooltipValue = getTooltip(requests)}
              {#key tooltipValue}
                <td class:today={isToday(startDate)} class="fixed td-body" use:tooltip={tooltipValue}>
                  <div class="flex-center">
                    {getTotal(
                      requests,
                      startDate,
                      endDate,
                      types,
                      getHolidayDatesForEmployee(staffDepartmentMap, employee._id, holidays)
                    )}
                  </div>
                </td>
              {/key}
            {/each}
          </tr>
        {/each}
        <tr class="tr-body">
          <td class="fixed td-body summary">
            <Label label={hr.string.Summary} />
          </td>
          {#each values as value, i}
            {@const startDate = getStartDate(currentDate.getFullYear(), value)}
            {@const endDate = getEndDate(currentDate.getFullYear(), value)}
            <td class:today={isToday(startDate)} class="fixed td-body summary">
              <div class="flex-center">
                {getTotal(
                  [...employeeRequests.values()].flat(),
                  startDate,
                  endDate,
                  types,
                  [...holidays.values()].flat()
                )}
              </div>
            </td>
          {/each}
        </tr>
      </tbody>
    </table>
  </Scroller>
{:else}
  <div class="flex-center h-full w-full flex-grow fs-title">
    <Label label={hr.string.NoEmployeesInDepartment} />
  </div>
{/if}

<style lang="scss">
  table {
    position: relative;
    border-collapse: separate;
    width: 100%;

    td,
    th {
      padding: 0 0.5rem;
      width: 2.25rem;
      min-width: 2.25rem;
      border: 1px solid var(--accent-bg-color);
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
      border: none;
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
    }
    td {
      height: 3.5rem;
      border: none;
      color: var(--caption-color);
      &.today {
        background-color: var(--accented-button-disabled);
      }
      &.summary {
        font-weight: 600;
      }
      &.td-body {
        border-bottom: 1px solid var(--divider-color);
        &:not(:last-child) {
          border-right: 1px solid var(--divider-color);
        }
      }
    }
    th.last-row {
      border-bottom: 1px solid var(--divider-color);
    }
  }
</style>
