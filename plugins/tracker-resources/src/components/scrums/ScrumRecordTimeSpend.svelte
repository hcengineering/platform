<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import core, { Doc, Ref, SortingOrder, TxCollectionCUD, TxCreateDoc, TxCUD, TxUpdateDoc } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Issue, TimeSpendReport } from '@hcengineering/tracker'
  import { List } from '@hcengineering/view-resources'
  import tracker from '../../plugin'

  type TimeSpendByEmployee = { [key: Ref<Employee>]: number | undefined }
  type TimeSpendByIssue = { [key: Ref<Issue>]: TimeSpendByEmployee | undefined }
  type TimeSpendInfo = {
    issueId: Ref<Issue>
    value: number
    employee: Ref<Employee>
  }

  export let members: Ref<Employee>[]
  export let txes: TxCUD<Doc>[] = []
  export let onNavigate: () => void

  const issuesQuery = createQuery()

  let timeSpendInfoByIssue: TimeSpendByIssue = {}
  let viewableIssues: Issue[] = []

  $: issueTxes = txes.filter((tx) => tx.objectClass === tracker.class.Issue)
  $: {
    timeSpendInfoByIssue = {}
    const timeSpendRecords: { [key: Ref<TimeSpendReport>]: TimeSpendInfo | undefined } = {}

    const timeSpendTxes = (issueTxes as TxCollectionCUD<Issue, TimeSpendReport>[]).filter(
      (tx) => tx.tx.objectClass === tracker.class.TimeSpendReport
    )

    const addNewTimeSpend = (
      issueId: Ref<Issue>,
      timeSpendId: Ref<TimeSpendReport>,
      employee?: Ref<Employee> | null,
      newValue?: number
    ) => {
      if (newValue && employee && members.includes(employee)) {
        if (!(issueId in timeSpendInfoByIssue)) {
          timeSpendInfoByIssue[issueId] = {}
        }

        const recordedValue = timeSpendInfoByIssue[issueId]![employee] ?? 0

        timeSpendInfoByIssue[issueId]![employee] = newValue + recordedValue
        timeSpendRecords[timeSpendId] = {
          issueId,
          employee,
          value: newValue
        }
      }
    }

    timeSpendTxes
      .filter((tx) => tx.tx._class === core.class.TxCreateDoc)
      .forEach((tx) => {
        const timeSpendTxCreate = tx.tx as TxCreateDoc<TimeSpendReport>
        const employee = timeSpendTxCreate.attributes.employee
        const newValue = timeSpendTxCreate.attributes.value

        addNewTimeSpend(tx.objectId, tx.tx.objectId, employee, newValue)
        console.log(JSON.stringify({ newValue, employee }))
        console.log('TX:', JSON.stringify(tx.tx))
      })

    timeSpendTxes
      .filter((tx) => tx.tx._class === core.class.TxUpdateDoc)
      .forEach((tx) => {
        const timeSpendTxUpdate = tx.tx as TxUpdateDoc<TimeSpendReport>
        const employee = timeSpendTxUpdate.operations.employee
        const value = timeSpendTxUpdate.operations.value
        const timeSpendId = timeSpendTxUpdate.objectId
        const recordedTimeSpend = timeSpendRecords[timeSpendId]

        if (employee || value) {
          if (recordedTimeSpend) {
            const recordedValueByEmployee =
              timeSpendInfoByIssue[recordedTimeSpend.issueId]![recordedTimeSpend.employee]!

            const newValue = recordedValueByEmployee - recordedTimeSpend.value
            if (newValue === 0) {
              delete timeSpendInfoByIssue[recordedTimeSpend.issueId]![recordedTimeSpend.employee]
            } else {
              timeSpendInfoByIssue[recordedTimeSpend.issueId]![recordedTimeSpend.employee] = newValue
            }
          }

          const recordingValue = value ?? recordedTimeSpend?.value
          const recordingEmployee = employee ?? recordedTimeSpend?.employee
          console.log(JSON.stringify({ recordingValue, recordingEmployee }))
          console.log('TX:', JSON.stringify(tx.tx))

          addNewTimeSpend(tx.objectId, timeSpendId, recordingEmployee, recordingValue)
        }
      })
  }

  // Update reported time and assignee for tracked issues according to tracked TimeSpendReports
  $: issuesQuery.query(
    tracker.class.Issue,
    {
      _id: { $in: Object.keys(timeSpendInfoByIssue) as Ref<Issue>[] }
    },
    (res) => {
      const issues = res
      viewableIssues = []

      for (const [issueId, timeSpendInfo] of Object.entries(timeSpendInfoByIssue)) {
        const currentIssue = issues.find((issue) => issue._id === issueId)

        if (!timeSpendInfo || !currentIssue) {
          return
        }
        for (const [employeeId, reportedTime] of Object.entries(timeSpendInfo)) {
          viewableIssues.push({ ...currentIssue, reportedTime: reportedTime!, assignee: employeeId as Ref<Employee> })
        }

        viewableIssues = viewableIssues.sort(
          (issueLeft, issueRight) => issueRight.reportedTime - issueLeft.reportedTime
        )
      }
    },
    {
      sort: { priority: SortingOrder.Ascending }
    }
  )
</script>

<List
  _class={tracker.class.Issue}
  documents={viewableIssues}
  config={[
    {
      key: '',
      presenter: tracker.component.PriorityEditor,
      props: { kind: 'list', size: 'small', isEditable: false }
    },
    { key: '', presenter: tracker.component.IssuePresenter, props: { onClick: onNavigate } },
    {
      key: '',
      presenter: tracker.component.StatusEditor,
      props: { kind: 'list', size: 'small', justify: 'center', isEditable: false }
    },
    {
      key: '',
      presenter: tracker.component.TitlePresenter,
      props: { shouldUseMargin: true, showParent: false, onClick: onNavigate }
    },
    { key: '', presenter: tracker.component.SubIssuesSelector, props: {} },
    {
      key: '',
      presenter: tracker.component.DueDatePresenter,
      props: { kind: 'list', isEditable: false }
    },
    {
      key: '',
      presenter: tracker.component.MilestoneEditor,
      displayProps: {
        excludeByKey: 'milestone'
      },
      props: {
        kind: 'list',
        size: 'small',
        shape: 'round',
        shouldShowPlaceholder: false,
        isEditable: false
      }
    },
    {
      key: '',
      presenter: tracker.component.EstimationEditor,
      props: { kind: 'list', size: 'small', isEditable: false }
    },
    {
      key: 'modifiedOn',
      presenter: tracker.component.ModificationDatePresenter,
      props: {}
    }
  ]}
  viewOptions={{ orderBy: ['modifiedOn', SortingOrder.Descending], groupBy: ['assignee'] }}
/>
