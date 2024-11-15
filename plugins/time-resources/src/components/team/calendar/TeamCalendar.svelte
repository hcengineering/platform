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
  import calendar, { Event, getAllEvents } from '@hcengineering/calendar'
  import { calendarByIdStore } from '@hcengineering/calendar-resources'
  import { Person, PersonAccount } from '@hcengineering/contact'
  import core, {
    Account,
    Doc,
    IdMap,
    Ref,
    Timestamp,
    Tx,
    TxCUD,
    TxCreateDoc,
    TxUpdateDoc,
    getCurrentAccount
  } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Project } from '@hcengineering/task'
  import { ToDo, WorkSlot } from '@hcengineering/time'
  import { Icon, tooltip } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import time from '../../../plugin'
  import TimePresenter from '../../presenters/TimePresenter.svelte'
  import WithTeamData from '../WithTeamData.svelte'
  import { groupTeamData, toSlots } from '../utils'
  import PersonCalendar from './PersonCalendar.svelte'
  import TxPanel from './TxPanel.svelte'

  export let space: Ref<Project>
  export let currentDate: Date
  export let maxDays = 5

  $: fromDate = new Date(currentDate).setDate(currentDate.getDate() - Math.round(maxDays / 2 + 1))
  $: toDate = new Date(currentDate).setDate(currentDate.getDate() + Math.round(maxDays / 2 + 1))
  const me = (getCurrentAccount() as PersonAccount).person

  let project: Project | undefined
  let personAccounts: PersonAccount[] = []
  let slots: WorkSlot[] = []
  let events: Event[] = []
  let todos: IdMap<ToDo> = new Map()
  let persons: Ref<Person>[] = []

  const txCreateQuery = createQuery()

  let txes = new Map<Ref<Account>, Tx[]>()

  $: txCreateQuery.query(
    core.class.Tx,
    { modifiedBy: { $in: Array.from(personAccounts.map((it) => it._id)) }, modifiedOn: { $gt: fromDate, $lt: toDate } },
    (res) => {
      const map = new Map<Ref<Account>, Tx[]>()
      for (const t of res) {
        const account = t.createdBy ?? t.modifiedBy
        map.set(account, [...(map.get(account) ?? []), t])
      }
      txes = map
    }
  )

  const client = getClient()

  function group (
    txMap: Map<Ref<Account>, Tx[]>,
    persons: Ref<Account>[],
    from: Timestamp,
    to: Timestamp
  ): { add: Map<Asset, { count: number, tx: TxCUD<Doc>[] }>, change: Map<Asset, { count: number, tx: TxCUD<Doc>[] }> } {
    const txes = persons.flatMap((it) => txMap.get(it))
    const add = new Map<Asset, { count: number, tx: TxCUD<Doc>[] }>()
    const change = new Map<Asset, { count: number, tx: TxCUD<Doc>[] }>()
    const h = client.getHierarchy()

    for (const tx of txes) {
      if (tx === undefined || tx.modifiedOn < from || tx.modifiedOn > to) {
        continue
      }
      if (tx._class === core.class.TxCreateDoc) {
        const txAdd = tx as TxCreateDoc<Doc>
        if (h.isDerived(txAdd.objectClass, core.class.Space)) {
          continue
        }
        try {
          h.getClass(txAdd.objectClass)
        } catch (err) {
          continue
        }
        const cl = h.getClass(txAdd.objectClass)

        const presenter = h.classHierarchyMixin(txAdd.objectClass, view.mixin.ObjectPresenter)
        if (cl.icon !== undefined && presenter !== undefined) {
          const v = add.get(cl.icon) ?? { count: 0, tx: [] }
          v.count++
          v.tx.push(txAdd)
          add.set(cl.icon, v)
        }
      }
      if (tx._class === core.class.TxUpdateDoc) {
        const txUpd = tx as TxUpdateDoc<Doc>
        try {
          h.getClass(txUpd.objectClass)
        } catch (err) {
          continue
        }
        if (h.isDerived(txUpd.objectClass, core.class.Space)) {
          continue
        }
        const cl = h.getClass(txUpd.objectClass)
        const presenter = h.classHierarchyMixin(txUpd.objectClass, view.mixin.ObjectPresenter)
        if (cl.icon !== undefined && presenter !== undefined) {
          const v = change.get(cl.icon) ?? { count: 0, tx: [] }
          v.count++
          v.tx.push(txUpd)
          change.set(cl.icon, v)
        }
      }
    }
    return { add, change }
  }

  $: allSlots = getAllEvents(slots, fromDate, toDate)
  $: allEvents = getAllEvents(events, fromDate, toDate)
</script>

<WithTeamData
  {space}
  {fromDate}
  {toDate}
  bind:project
  bind:personAccounts
  bind:todos
  bind:slots
  bind:events
  bind:persons
/>

<PersonCalendar {persons} startDate={currentDate} {maxDays}>
  <svelte:fragment slot="day" let:day let:today let:weekend let:person let:height>
    {@const dayFrom = new Date(day).setHours(0, 0, 0, 0)}
    {@const dayTo = new Date(day).setHours(23, 59, 59, 999)}
    {@const grouped = groupTeamData(
      toSlots(getAllEvents(allSlots, dayFrom, dayTo)),
      todos,
      getAllEvents(allEvents, dayFrom, dayTo),
      personAccounts,
      me,
      $calendarByIdStore
    )}
    {@const gitem = grouped.find((it) => it.user === person)}
    {@const planned = gitem?.mappings.reduce((it, val) => it + val.total, 0) ?? 0}
    {@const pevents = gitem?.events.reduce((it, val) => it + (val.dueDate - val.date), 0) ?? 0}
    {@const busy = gitem?.busy.slots.reduce((it, val) => it + (val.dueDate - val.date), 0) ?? 0}
    {@const accounts = personAccounts.filter((it) => it.person === person).map((it) => it._id)}
    {@const txInfo = group(txes, accounts, dayFrom, dayTo)}
    <div style:overflow="auto" style:height="{height}rem" class="p-1">
      <div class="flex-row-center p-1">
        <Icon icon={time.icon.Team} size={'small'} />
        <TimePresenter value={gitem?.total ?? 0} />
      </div>
      <div class="flex flex-row-center">
        {#if planned > 0}
          <div class="flex-row-center p-1 flex-nowrap">
            <Icon icon={time.icon.FilledFlag} size={'small'} fill={'var(--positive-button-default)'} />
            <TimePresenter value={planned} />
          </div>
        {/if}

        {#if pevents > 0}
          <div class="flex-row-center p-1 flex-nowrap">
            <Icon icon={calendar.icon.Calendar} size={'small'} fill={'var(--positive-button-default)'} />
            <TimePresenter value={pevents} />
          </div>
        {/if}

        {#if busy > 0}
          <div class="flex-row-center p-1 flex-nowrap">
            <Icon icon={calendar.icon.Private} size={'small'} fill={'var(--positive-button-default)'} />
            <TimePresenter value={busy} />
          </div>
        {/if}
      </div>
      {#if txInfo.add.size > 0}
        <div class="flex">
          {#each Array.from(txInfo.add.entries()) as add}
            <div
              class="flex-row-center p-1 no-word-wrap flex-nowrap"
              use:tooltip={{
                component: TxPanel,
                props: { tx: add[1].tx }
              }}
            >
              <span class="mr-1">
                <Icon icon={add[0]} size={'small'} fill={'var(--positive-button-default)'} />
              </span>
              {add[1].count}
            </div>
          {/each}
        </div>
      {/if}
      {#if txInfo.change.size > 0}
        <div class="flex">
          {#each Array.from(txInfo.change.entries()) as change}
            <div
              class="flex-row-center p-1 no-word-wrap flex-nowrap"
              use:tooltip={{
                component: TxPanel,
                props: { tx: change[1].tx }
              }}
            >
              <span class="mr-1">
                <Icon icon={change[0]} size={'small'} fill={'var(--activity-status-busy)'} />
              </span>
              {change[1].count}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </svelte:fragment>
</PersonCalendar>
