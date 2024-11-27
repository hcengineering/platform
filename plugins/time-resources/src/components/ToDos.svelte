<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import type { DocumentQuery, Ref, WithLookup, IdMap } from '@hcengineering/core'
  import type { ToDo, WorkSlot } from '@hcengineering/time'
  import type { PersonAccount } from '@hcengineering/contact'
  import type { IntlString } from '@hcengineering/platform'
  import type { TagElement } from '@hcengineering/tags'
  import type { Project } from '@hcengineering/tracker'
  import type { ToDosMode } from '..'
  import {
    Scroller,
    areDatesEqual,
    todosSP,
    defaultSP,
    Header,
    ButtonIcon,
    Label,
    IconMenuOpen,
    IconMenuClose,
    deviceOptionsStore as deviceInfo
  } from '@hcengineering/ui'
  import { getCurrentAccount, toIdMap, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import tracker from '@hcengineering/tracker'
  import tags from '@hcengineering/tags'
  import view from '@hcengineering/view-resources/src/plugin'
  import { getNearest } from '../utils'
  import CreateToDo from './CreateToDo.svelte'
  import ToDoGroup from './ToDoGroup.svelte'
  import time from '../plugin'

  export let mode: ToDosMode
  export let tag: Ref<TagElement> | undefined
  export let currentDate: Date

  const acc = getCurrentAccount() as PersonAccount
  const user = acc.person

  const doneQuery = createQuery()
  const inboxQuery = createQuery()
  const activeQuery = createQuery()
  const tagsQuery = createQuery()
  const projectsQuery = createQuery()

  let projects: IdMap<Project> = new Map()
  projectsQuery.query(tracker.class.Project, { archived: false }, (result) => {
    projects = toIdMap(result)
  })

  let ids: Ref<ToDo>[] = []

  $: updateTags(mode, tag)

  function togglePlannerNav (): void {
    $deviceInfo.navigator.visible = !$deviceInfo.navigator.visible
  }

  function updateTags (mode: ToDosMode, tag: Ref<TagElement> | undefined): void {
    if (mode !== 'tag' || tag === undefined) {
      tagsQuery.unsubscribe()
      ids = []
      return
    }
    tagsQuery.query(
      tags.class.TagReference,
      {
        tag
      },
      (res) => {
        ids = res.map((p) => p.attachedTo as Ref<ToDo>)
      }
    )
  }

  function update (mode: ToDosMode, currentDate: Date, ids: Ref<ToDo>[]): void {
    let activeQ: DocumentQuery<ToDo> | undefined = undefined
    let doneQ: DocumentQuery<ToDo> | undefined = undefined
    let inboxQ: DocumentQuery<ToDo> | undefined = undefined
    if (mode === 'unplanned') {
      activeQ = undefined
      doneQ = undefined
      inboxQ = {
        user,
        doneOn: null,
        workslots: 0
      }
    } else if (mode === 'planned') {
      inboxQ = undefined
      doneQ = {
        doneOn: { $gte: currentDate.setHours(0, 0, 0, 0), $lte: currentDate.setHours(23, 59, 59, 999) },
        user
      }
      activeQ = {
        user,
        doneOn: null,
        workslots: { $gt: 0 }
      }
    } else if (mode === 'all' || mode === 'date') {
      inboxQ = {
        doneOn: null,
        workslots: 0,
        user
      }
      doneQ = {
        doneOn: { $ne: null },
        user
      }
      activeQ = {
        user,
        doneOn: null,
        workslots: { $gt: 0 }
      }
    } else if (mode === 'tag') {
      inboxQ = {
        doneOn: null,
        workslots: 0,
        user,
        _id: { $in: ids }
      }
      doneQ = {
        doneOn: { $ne: null },
        user,
        _id: { $in: ids }
      }
      activeQ = {
        user,
        doneOn: null,
        workslots: { $gt: 0 },
        _id: { $in: ids }
      }
    }
    if (activeQ !== undefined) {
      activeQuery.query(
        time.class.ToDo,
        activeQ,
        (res) => {
          rawActive = res
        },
        {
          limit: 200,
          sort: { rank: SortingOrder.Ascending },
          lookup: { _id: { workslots: time.class.WorkSlot } }
        }
      )
    } else {
      activeQuery.unsubscribe()
      rawActive = []
    }

    if (inboxQ !== undefined) {
      inboxQuery.query(
        time.class.ToDo,
        inboxQ,
        (res) => {
          inbox = res
        },
        {
          limit: 200,
          sort: { rank: SortingOrder.Ascending }
        }
      )
    } else {
      inboxQuery.unsubscribe()
      inbox = []
    }

    if (doneQ !== undefined) {
      doneQuery.query(
        time.class.ToDo,
        doneQ,
        (res) => {
          done = res
        },
        { limit: 200, sort: { doneOn: SortingOrder.Descending }, lookup: { _id: { workslots: time.class.WorkSlot } } }
      )
    } else {
      doneQuery.unsubscribe()
      done = []
    }
  }

  $: update(mode, currentDate, ids)

  let inbox: WithLookup<ToDo>[] = []
  let done: WithLookup<ToDo>[] = []
  let rawActive: WithLookup<ToDo>[] = []
  $: active = filterActive(mode, rawActive, currentDate)

  $: groups = group(inbox, done, active)

  function filterActive (mode: ToDosMode, raw: WithLookup<ToDo>[], currentDate: Date): WithLookup<ToDo>[] {
    if (mode === 'planned') {
      const today = areDatesEqual(new Date(), currentDate)
      const res: WithLookup<ToDo>[] = []
      const endDay = new Date().setHours(23, 59, 59, 999)
      for (const todo of raw) {
        const nearest = getNearest(getWorkslots(todo))
        if (nearest === undefined) {
          res.push(todo)
        } else {
          if (today) {
            if (nearest.dueDate < endDay) {
              res.push(todo)
            }
          } else if (areDatesEqual(new Date(nearest.date), currentDate)) {
            res.push(todo)
          }
        }
      }
      return res
    } else {
      return raw
    }
  }

  function getWorkslots (todo: WithLookup<ToDo>): WorkSlot[] {
    return (todo.$lookup?.workslots ?? []) as WorkSlot[]
  }

  function group (
    unplanned: WithLookup<ToDo>[],
    done: WithLookup<ToDo>[],
    active: WithLookup<ToDo>[]
  ): [IntlString, WithLookup<ToDo>[]][] {
    const groups = new Map<IntlString, WithLookup<ToDo>[]>([
      [time.string.Scheduled, []],
      [time.string.Unplanned, unplanned],
      [time.string.ToDos, []],
      [time.string.Done, done]
    ])
    const now = Date.now()
    const todos: {
      nearest: WorkSlot | undefined
      todo: WithLookup<ToDo>
    }[] = []
    const scheduled: {
      nearest: WorkSlot | undefined
      todo: WithLookup<ToDo>
    }[] = []
    for (const todo of active) {
      if (todo.$lookup?.workslots !== undefined) {
        todo.$lookup.workslots = getWorkslots(todo).sort((a, b) => a.date - b.date)
      }
      const nearest = getNearest(getWorkslots(todo))
      if (nearest === undefined || nearest.dueDate < now) {
        todos.push({
          nearest,
          todo
        })
      } else {
        scheduled.push({
          nearest,
          todo
        })
      }
    }
    groups.set(
      time.string.ToDos,
      todos.map((p) => p.todo)
    )
    groups.set(
      time.string.Scheduled,
      scheduled.map((p) => p.todo)
    )
    return Array.from(groups)
  }
  const getDateStr = (date: Date): string => {
    return date.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })
  }
  $: filteredGroups = groups.filter(
    (gr) =>
      (mode === 'unplanned' && gr[0] === time.string.Unplanned) ||
      (mode === 'planned' && (gr[0] === time.string.ToDos || gr[0] === time.string.Scheduled)) ||
      (mode !== 'unplanned' && mode !== 'planned')
  )
</script>

<div class="toDos-container">
  <Header type={'type-panel'} hideSeparator adaptive={'disabled'}>
    <ButtonIcon
      icon={$deviceInfo.navigator.visible ? IconMenuClose : IconMenuOpen}
      kind={'tertiary'}
      size={'small'}
      pressed={!$deviceInfo.navigator.visible}
      on:click={togglePlannerNav}
    />
    <div class="heading-bold-20 ml-4">
      {#if mode === 'date'}
        {getDateStr(currentDate)}
      {:else}
        <Label
          label={mode === 'all'
            ? time.string.All
            : mode === 'planned'
              ? time.string.Planned
              : mode === 'unplanned'
                ? time.string.Unplanned
                : view.string.Labels}
        />
      {/if}
    </div>
  </Header>
  <CreateToDo fullSize />

  <Scroller fade={filteredGroups.length > 1 ? todosSP : defaultSP} noStretch>
    {#each filteredGroups as group}
      <ToDoGroup
        todos={group[1]}
        title={group[0]}
        showTitle
        showDuration={group[0] !== time.string.Unplanned}
        {mode}
        {projects}
      />
    {/each}
  </Scroller>
</div>

<style lang="scss">
  /* Global styles in components.scss */
  .toDos-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    min-height: 0;
  }
</style>
