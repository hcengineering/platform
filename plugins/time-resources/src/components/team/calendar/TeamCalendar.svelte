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
  import contact, { getCurrentEmployee, Person } from '@hcengineering/contact'
  import { employeeRefByAccountUuidStore, getPersonRefsByPersonIdsCb } from '@hcengineering/contact-resources'
  import core, {
    Doc,
    IdMap,
    PersonId,
    Ref,
    Timestamp,
    Tx,
    TxCreateDoc,
    TxCUD,
    TxUpdateDoc,
    unique
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
  const me = getCurrentEmployee()

  let project: Project | undefined
  let slots: WorkSlot[] = []
  let events: Event[] = []
  let todos: IdMap<ToDo> = new Map()

  $: personsRefs = (project?.members ?? [])
    .map((it) => $employeeRefByAccountUuidStore.get(it))
    .filter((it) => it !== undefined)

  const txCreateQuery = createQuery()

  let personsSocialIds: PersonId[] = []
  let txes: Tx[] = []
  let txesMap = new Map<Ref<Person>, Tx[]>()

  const socialIdsQuery = createQuery()
  $: if (personsRefs.length > 0) {
    socialIdsQuery.query(contact.class.SocialIdentity, { attachedTo: { $in: personsRefs } }, (res) => {
      personsSocialIds = res.map((si) => si._id).flat()
    })
  } else {
    socialIdsQuery.unsubscribe()
  }

  $: txCreateQuery.query(
    core.class.Tx,
    { modifiedBy: { $in: personsSocialIds }, modifiedOn: { $gt: fromDate, $lt: toDate } },
    (res) => {
      txes = res
    }
  )
  $: getPersonRefsByPersonIdsCb(unique(txes.map((it) => it.createdBy ?? it.modifiedBy)), (res) => {
    const map = new Map<Ref<Person>, Tx[]>()
    for (const t of txes) {
      const personId = t.createdBy ?? t.modifiedBy
      const personRef = res.get(personId)
      if (personRef === undefined) continue
      map.set(personRef, [...(map.get(personRef) ?? []), t])
    }
    txesMap = map
  })

  const client = getClient()

  function group (
    txes: Tx[],
    from: Timestamp,
    to: Timestamp
  ): { add: Map<Asset, { count: number, tx: TxCUD<Doc>[] }>, change: Map<Asset, { count: number, tx: TxCUD<Doc>[] }> } {
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

<WithTeamData {space} {fromDate} {toDate} bind:project bind:todos bind:slots bind:events bind:persons={personsRefs} />

<PersonCalendar persons={personsRefs} startDate={currentDate} {maxDays}>
  <svelte:fragment slot="day" let:day let:today let:weekend let:person let:height>
    {@const dayFrom = new Date(day).setHours(0, 0, 0, 0)}
    {@const dayTo = new Date(day).setHours(23, 59, 59, 999)}
    {@const grouped = groupTeamData(
      toSlots(getAllEvents(allSlots, dayFrom, dayTo)),
      todos,
      getAllEvents(allEvents, dayFrom, dayTo),
      me,
      $calendarByIdStore
    )}
    {@const gitem = grouped.find((it) => it.user === person)}
    {@const planned = gitem?.mappings.reduce((it, val) => it + val.total, 0) ?? 0}
    {@const pevents = gitem?.events.reduce((it, val) => it + (val.dueDate - val.date), 0) ?? 0}
    {@const busy = gitem?.busy.slots.reduce((it, val) => it + (val.dueDate - val.date), 0) ?? 0}
    {@const txInfo = group(txesMap.get(person) ?? [], dayFrom, dayTo)}
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
