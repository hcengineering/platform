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
  import contact, { Employee } from '@hcengineering/contact'
  import { AttachedData, Class, DocumentUpdate, Ref, Space } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import presentation, { Card, getClient, UserBox } from '@hcengineering/presentation'
  import { Issue, TimeReportDayType, TimeSpendReport } from '@hcengineering/tracker'
  import { DatePresenter, EditBox } from '@hcengineering/ui'
  import tracker from '../../../plugin'
  import { getTimeReportDate, getTimeReportDayType } from '../../../utils'
  import TimeReportDayDropdown from './TimeReportDayDropdown.svelte'

  export let issueId: Ref<Issue>
  export let issueClass: Ref<Class<Issue>>
  export let space: Ref<Space>
  export let assignee: Ref<Employee> | undefined

  export let value: TimeSpendReport | undefined
  export let placeholder: IntlString = tracker.string.TimeSpendReportValue
  export let defaultTimeReportDay = TimeReportDayType.PreviousWorkDay

  const data = {
    date: value?.date ?? getTimeReportDate(defaultTimeReportDay),
    description: value?.description ?? '',
    value: value?.value,
    employee: value?.employee ?? assignee ?? null
  }

  let selectedTimeReportDay = getTimeReportDayType(data.date)

  export function canClose (): boolean {
    return true
  }

  async function create (): Promise<void> {
    if (value === undefined) {
      getClient().addCollection(
        tracker.class.TimeSpendReport,
        space,
        issueId,
        issueClass,
        'reports',
        data as AttachedData<TimeSpendReport>
      )
    } else {
      const ops: DocumentUpdate<TimeSpendReport> = {}
      if (value.value !== data.value) {
        ops.value = data.value
      }
      if (value.employee !== data.employee) {
        ops.employee = data.employee
      }
      if (value.description !== data.description) {
        ops.description = data.description
      }
      if (value.date !== data.date) {
        ops.date = data.date
      }
      if (Object.keys(ops).length > 0) {
        getClient().update(value, ops)
      }
    }
  }
</script>

<Card
  label={tracker.string.TimeSpendReportAdd}
  canSave={Number.isFinite(data.value) && data.value !== 0}
  okAction={create}
  on:close
  okLabel={value === undefined ? presentation.string.Create : presentation.string.Save}
>
  <div class="flex-row-center gap-2">
    <EditBox focus bind:value={data.value} {placeholder} format={'number'} maxDigitsAfterPoint={3} kind={'editbox'} />
    <UserBox
      _class={contact.class.Employee}
      label={contact.string.Employee}
      kind={'link-bordered'}
      bind:value={data.employee}
      showNavigate={false}
    />
    <TimeReportDayDropdown
      bind:selected={selectedTimeReportDay}
      on:selected={({ detail }) => (data.date = getTimeReportDate(detail))}
    />
    <DatePresenter
      kind={'link'}
      bind:value={data.date}
      editable
      on:change={({ detail }) => (selectedTimeReportDay = getTimeReportDayType(detail))}
    />
  </div>
  <EditBox bind:value={data.description} placeholder={tracker.string.TimeSpendReportDescription} kind={'editbox'} />
</Card>
