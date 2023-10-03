<!--
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { UserBox } from '@hcengineering/contact-resources'
  import { Issue, TimeReportDayType, TimeSpendReport } from '@hcengineering/tracker'
  import { Button, DatePresenter, EditBox, Label } from '@hcengineering/ui'
  import tracker from '../../../plugin'
  import { getTimeReportDate, getTimeReportDayType } from '../../../utils'
  import TitlePresenter from '../TitlePresenter.svelte'
  import TimeReportDayDropdown from './TimeReportDayDropdown.svelte'

  export let issue: Issue | undefined = undefined
  export let issueId: Ref<Issue> | undefined = issue?._id
  export let issueClass: Ref<Class<Issue>> = issue?._class ?? tracker.class.Issue
  export let space: Ref<Space> | undefined = issue?.space
  export let assignee: Ref<Employee> | null | undefined = issue?.assignee as Ref<Employee>

  export let value: TimeSpendReport | undefined
  export let placeholder: IntlString = tracker.string.TimeSpendReportValue
  export let defaultTimeReportDay: TimeReportDayType = TimeReportDayType.PreviousWorkDay

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

  const client = getClient()

  async function create (): Promise<void> {
    if (value === undefined) {
      if (space && issueId) {
        await client.addCollection(
          tracker.class.TimeSpendReport,
          space,
          issueId,
          issueClass,
          'reports',
          data as AttachedData<TimeSpendReport>
        )
      }
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
        await client.update(value, ops)
      }
    }
  }

  $: canSave = Number.isFinite(data.value) && data.value !== 0 && space !== undefined && issueId !== undefined
</script>

<Card
  label={value === undefined ? tracker.string.TimeSpendReportAdd : tracker.string.TimeSpendReportValue}
  {canSave}
  okAction={create}
  gap={'gapV-4'}
  on:close
  okLabel={value === undefined ? presentation.string.Create : presentation.string.Save}
  on:changeContent
>
  <svelte:fragment slot="header">
    {#if issue}
      <TitlePresenter showParent={false} value={issue} />
    {/if}
  </svelte:fragment>
  <div class="flex-row-center gap-2">
    <EditBox
      autoFocus
      bind:value={data.value}
      {placeholder}
      maxWidth={'9rem'}
      format={'number'}
      maxDigitsAfterPoint={3}
      kind={'editbox'}
    />
    <Button kind={'link-bordered'} on:click={() => (data.value = 1)}
      ><span slot="content">1<Label label={tracker.string.HourLabel} /></span></Button
    >
    <Button kind={'link-bordered'} on:click={() => (data.value = 2)}
      ><span slot="content">2<Label label={tracker.string.HourLabel} /></span></Button
    >
    <Button kind={'link-bordered'} on:click={() => (data.value = 4)}
      ><span slot="content">4<Label label={tracker.string.HourLabel} /></span></Button
    >
    <Button kind={'link-bordered'} on:click={() => (data.value = 6)}
      ><span slot="content">6<Label label={tracker.string.HourLabel} /></span></Button
    >
    <Button kind={'link-bordered'} on:click={() => (data.value = 7)}
      ><span slot="content">7<Label label={tracker.string.HourLabel} /></span></Button
    >
    <Button kind={'link-bordered'} on:click={() => (data.value = 8)}
      ><span slot="content">8<Label label={tracker.string.HourLabel} /></span></Button
    >
  </div>
  <EditBox bind:value={data.description} placeholder={tracker.string.TimeSpendReportDescription} kind={'editbox'} />
  <svelte:fragment slot="pool">
    <UserBox
      _class={contact.mixin.Employee}
      label={contact.string.Employee}
      kind={'regular'}
      size={'large'}
      bind:value={data.employee}
      showNavigate={false}
    />
    <TimeReportDayDropdown
      kind={'regular'}
      size={'large'}
      bind:selected={selectedTimeReportDay}
      on:selected={({ detail }) => (data.date = getTimeReportDate(detail))}
    />
    <DatePresenter
      bind:value={data.date}
      editable
      kind={'regular'}
      size={'large'}
      on:change={({ detail }) => (selectedTimeReportDay = getTimeReportDayType(detail))}
    />
  </svelte:fragment>
</Card>
