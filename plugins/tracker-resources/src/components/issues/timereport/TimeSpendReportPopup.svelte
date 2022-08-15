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
  import contact from '@anticrm/contact'
  import { AttachedData, Class, DocumentUpdate, Ref, Space } from '@anticrm/core'
  import type { IntlString } from '@anticrm/platform'
  import presentation, { Card, getClient, UserBox } from '@anticrm/presentation'
  import { Issue, TimeSpendReport } from '@anticrm/tracker'
  import { DatePresenter, EditBox } from '@anticrm/ui'
  import tracker from '../../../plugin'

  export let issueId: Ref<Issue>
  export let issueClass: Ref<Class<Issue>>
  export let space: Ref<Space>

  export let value: TimeSpendReport | undefined
  export let placeholder: IntlString = tracker.string.TimeSpendReportValue
  export let maxWidth: string = '10rem'

  export function canClose (): boolean {
    return true
  }

  const data = {
    date: value?.date ?? Date.now(),
    description: value?.description ?? '',
    value: value?.value,
    employee: value?.employee ?? null
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
  canSave={data.value !== 0}
  okAction={create}
  on:close
  okLabel={value === undefined ? presentation.string.Create : presentation.string.Save}
>
  <div class="flex-row-center gap-2">
    <EditBox bind:value={data.value} {placeholder} format={'number'} kind={'editbox'} {maxWidth} focus />
    <UserBox
      _class={contact.class.Employee}
      label={contact.string.Employee}
      kind={'link-bordered'}
      bind:value={data.employee}
    />
    <DatePresenter kind={'link'} bind:value={data.date} editable />
  </div>
  <EditBox
    bind:value={data.description}
    placeholder={tracker.string.TimeSpendReportDescription}
    kind={'editbox'}
    {maxWidth}
  />
</Card>
