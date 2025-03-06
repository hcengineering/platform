<!--
//
// Copyright © 2025 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import { Schedule } from '@hcengineering/calendar'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { createQuery, getClient, getCurrentWorkspaceUrl, MessageBox } from '@hcengineering/presentation'
  import { Action, ButtonIcon, IconAdd, IconDelete, IconShare, NavItem, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { TreeElement } from '@hcengineering/view-resources'
  import ScheduleEditor from './ScheduleEditor.svelte'
  import calendar from '../plugin'
  import { SortingOrder } from '@hcengineering/core'
  import { getMetadata } from '@hcengineering/platform'

  const currentUser = getCurrentEmployee()
  const scheduleUrl = getMetadata(calendar.metadata.PublicScheduleURL)

  const scheduleQuery = createQuery()
  let schedules: Schedule[] = []

  scheduleQuery.query(
    calendar.class.Schedule,
    {
      owner: currentUser
    },
    (res) => {
      schedules = res
    },
    {
      sort: { title: SortingOrder.Ascending }
    }
  )

  async function getScheduleListActions (): Promise<Action[]> {
    return [
      {
        icon: IconAdd,
        label: calendar.string.ScheduleNew,
        inline: true,
        action: async () => {
          showPopup(ScheduleEditor, {}, undefined)
        }
      }
    ]
  }

  function deleteSchedule (schedule: Schedule): void {
    showPopup(
      MessageBox,
      {
        label: calendar.string.Value,
        labelProps: { value: schedule.title },
        message: calendar.string.ScheduleDeleteConfirm,
        params: { title: schedule.title },
        richMessage: true,
        dangerous: true,
        action: async () => {
          const client = getClient()
          await client.remove(schedule)
        }
      },
      undefined
    )
  }

  function shareLink (schedule: Schedule): void {
    const ws = getCurrentWorkspaceUrl()
    const link = `${scheduleUrl}/${ws}/${schedule._id}`
    showPopup(
      MessageBox,
      {
        label: calendar.string.Value,
        labelProps: { value: schedule.title },
        message: calendar.string.ScheduleSharedLinkMessage,
        params: { link },
        richMessage: true,
        okLabel: calendar.string.ScheduleSharedLinkCopy,
        canSubmit: false,
        action: async () => {
          await navigator.clipboard.writeText(link)
        }
      },
      undefined
    )
  }
</script>

{#if scheduleUrl !== undefined}
  <TreeElement
    _id="schedules-section"
    label={calendar.string.Schedule}
    actions={getScheduleListActions}
    parent
  >
    {#if schedules.length === 0}
      <NavItem
      label={calendar.string.ScheduleNew}
      icon={IconAdd}
      type={'type-object'}
      on:click={() => {
        showPopup(ScheduleEditor, {}, undefined)
      }} />
    {:else}
      {#each schedules as schedule}
        <NavItem
          title={schedule.title}
          icon={calendar.icon.Calendar}
          type={'type-object'}
          on:click={() => {
            showPopup(ScheduleEditor, { schedule }, undefined)
          }}
        >
          <svelte:fragment slot="actions">
            <ButtonIcon
              icon={IconShare}
              size={'extra-small'}
              kind={'tertiary'}
              tooltip={{ label: calendar.string.ScheduleShareLink, direction: 'top' }}
              on:click={() => {
                shareLink(schedule)
              }}
            />
            <ButtonIcon
              icon={IconDelete}
              size={'extra-small'}
              kind={'tertiary'}
              tooltip={{ label: view.string.Delete, direction: 'top' }}
              on:click={() => {
                deleteSchedule(schedule)
              }}
            />
          </svelte:fragment>
        </NavItem>
      {/each}
    {/if}
  </TreeElement>
{/if}
