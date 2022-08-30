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
  import contact, { Employee } from '@anticrm/contact'
  import { WithLookup } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import type { TimeSpendReport } from '@anticrm/tracker'
  import { eventToHTMLElement, Label, showPopup, tooltip } from '@anticrm/ui'
  import view, { AttributeModel } from '@anticrm/view'
  import { getObjectPresenter } from '@anticrm/view-resources'
  import tracker from '../../../plugin'
  import TimeSpendReportPopup from './TimeSpendReportPopup.svelte'

  export let value: WithLookup<TimeSpendReport>
  const client = getClient()
  let presenter: AttributeModel

  getObjectPresenter(client, contact.class.Employee, { key: '' }).then((p) => {
    presenter = p
  })

  function editSpendReport (event: MouseEvent): void {
    showPopup(
      TimeSpendReportPopup,
      { issue: value.attachedTo, issueClass: value.attachedToClass, value: value, assignee: value.employee },
      eventToHTMLElement(event)
    )
  }

  let employee: Employee | undefined | null = value.$lookup?.employee ?? null
  $: if (employee === undefined) {
    client.findOne(value.attachedToClass, { _id: value.attachedTo }).then((r) => {
      employee = r as Employee
    })
  }
</script>

{#if value}
  <span
    class="issuePresenterRoot flex-row-center"
    on:click={editSpendReport}
    use:tooltip={value.employee
      ? {
          label: tracker.string.TimeSpendReport,
          component: view.component.ObjectPresenter,
          props: {
            objectId: value.employee,
            _class: contact.class.Employee,
            value: value.$lookup?.employee
          }
        }
      : undefined}
  >
    <Label label={tracker.string.TimeSpendValue} params={{ value: value.value }} />
  </span>
{/if}

<style lang="scss">
  .issuePresenterRoot {
    white-space: nowrap;

    font-size: 0.8125rem;
    color: var(--content-color);
    cursor: pointer;

    &:hover {
      color: var(--caption-color);
      text-decoration: underline;
    }
    &:active {
      color: var(--accent-color);
    }
  }
</style>
