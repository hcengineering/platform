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
  import { WithLookup } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Issue, Project, TimeSpendReport } from '@hcengineering/tracker'
  import { eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import TimePresenter from './TimePresenter.svelte'
  import TimeSpendReportPopup from './TimeSpendReportPopup.svelte'

  export let value: WithLookup<TimeSpendReport>
  export let currentProject: Project | undefined
  const client = getClient()

  $: issue = value.$lookup?.attachedTo
  $: if (!issue) {
    client.findOne(value.attachedToClass, { _id: value.attachedTo }).then((r) => {
      issue = r as Issue
    })
  }
  $: defaultTimeReportDay = currentProject?.defaultTimeReportDay

  function editSpendReport (event: MouseEvent): void {
    showPopup(
      TimeSpendReportPopup,
      {
        issue,
        issueClass: value.attachedToClass,
        space: value.space,
        value,
        assignee: value.employee,
        defaultTimeReportDay
      },
      eventToHTMLElement(event)
    )
  }
</script>

{#if value && value.value}
  <TimePresenter id="TimeSpendReportValue" kind="link" value={value.value} on:click={editSpendReport} />
{/if}
