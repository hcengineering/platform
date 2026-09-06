<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import hr, { type Department } from '@hcengineering/hr'
  import { translate } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { type WorkingDaysConfig } from '@hcengineering/tracker'
  import { Button, DropdownLabels, Label, Toggle, getWeekDayName } from '@hcengineering/ui'

  import tracker from '../../plugin'
  import {
    applyDepartmentSelection,
    departmentItems,
    enableWorkingDays,
    isLastActiveWeekday,
    isWeekdayActive,
    toggleWeekdayBit
  } from '../gantt/lib/working-days-editor'

  /**
   * Two-way bound working-days config. `undefined` = legacy calendar-day
   * mode. Persistence is owned by the host dialog (CreateProject) — this
   * component only edits the value. Permission gating is inherited from the
   * host: the edit dialog opens through the EditProject action, whose
   * visibility is gated by view.function.CanEditSpace.
   */
  export let value: WorkingDaysConfig | undefined = undefined

  // Sentinel id for the "company-wide" dropdown entry (= root department).
  const COMPANY_WIDE = '#company-wide'

  // Model-optional runtime integration: only the hr declaration package is
  // imported statically; whether the HR *model* is installed is probed at
  // runtime. Without it the department selector is hidden entirely and the
  // weekday mask remains fully usable.
  const hrModelPresent = getClient().getHierarchy().hasClass(hr.class.PublicHoliday)

  const deptQuery = createQuery()
  let departments: Department[] = []
  $: if (hrModelPresent && value !== undefined) {
    deptQuery.query(hr.class.Department, {}, (res: Department[]) => {
      departments = res
    })
  } else {
    deptQuery.unsubscribe()
    departments = []
  }

  let companyWideLabel = ''
  $: void translate(tracker.string.WorkingDaysCompanyWide, {}, undefined).then((r) => {
    companyWideLabel = r
  })
  $: items = [{ id: COMPANY_WIDE, label: companyWideLabel }, ...departmentItems(departments, hr.ids.Head)]
  $: selectedDepartment = (value?.holidayDepartment as unknown as string | undefined) ?? COMPANY_WIDE

  // Monday 2024-01-01 anchors the locale-aware weekday labels (bit 0 = Mon).
  // Use LOCAL midnight, not UTC: getWeekDayName formats via Intl without a
  // timeZone, so a UTC-midnight anchor renders in the user's local zone and
  // shifts the label by a day in western timezones. 2024-01-01 is a Monday as
  // a local calendar date in every timezone.
  const WEEKDAY_BITS = [0, 1, 2, 3, 4, 5, 6]
  const weekdayLabel = (bit: number): string => getWeekDayName(new Date(2024, 0, 1 + bit), 'short')

  // All decision logic lives in the unit-tested lib helpers — the component
  // only maps events to assignments (kept trivially thin on purpose, since
  // there is no component test harness in this repo).
  function setEnabled (on: boolean): void {
    value = enableWorkingDays(on)
  }

  function onWeekday (bit: number): void {
    if (value === undefined) return
    // toggleWeekdayBit keeps the last active day — at least one working day
    // must stay active (validated in the pure helper, disabled in the UI).
    value = { ...value, weekdayMask: toggleWeekdayBit(value.weekdayMask, bit) }
  }

  function onDepartment (id: string): void {
    if (value === undefined) return
    value = applyDepartmentSelection(value, id, COMPANY_WIDE)
  }
</script>

<div class="flex-col flex-gap-2">
  <Toggle
    id={'working-days-mode'}
    on={value !== undefined}
    on:change={(ev) => {
      setEnabled(ev.detail)
    }}
  />
  {#if value === undefined}
    <span class="text-sm content-dark-color"><Label label={tracker.string.WorkingDaysNotConfigured} /></span>
  {:else}
    <div class="flex-row-center flex-gap-1">
      {#each WEEKDAY_BITS as bit}
        <Button
          kind={isWeekdayActive(value.weekdayMask, bit) ? 'primary' : 'regular'}
          size={'small'}
          disabled={isLastActiveWeekday(value.weekdayMask, bit)}
          on:click={() => {
            onWeekday(bit)
          }}
        >
          <svelte:fragment slot="content">{weekdayLabel(bit)}</svelte:fragment>
        </Button>
      {/each}
    </div>
    <span class="text-sm content-dark-color"><Label label={tracker.string.WorkingDaysAtLeastOneDay} /></span>
    {#if hrModelPresent}
      <div class="flex-row-center flex-gap-2">
        <Label label={tracker.string.WorkingDaysDepartment} />
        <DropdownLabels
          {items}
          selected={selectedDepartment}
          label={tracker.string.WorkingDaysDepartment}
          kind={'regular'}
          size={'medium'}
          on:selected={(ev) => {
            onDepartment(ev.detail)
          }}
        />
      </div>
    {/if}
  {/if}
</div>
