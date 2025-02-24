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
  import type { WithLookup, IdMap, Ref, Space } from '@hcengineering/core'
  import type { ToDo, WorkSlot } from '@hcengineering/time'
  import type { IntlString } from '@hcengineering/platform'
  import type { Project } from '@hcengineering/tracker'
  import type { ToDosMode } from '..'
  import { AccordionItem } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import { makeRank } from '@hcengineering/task'
  import ToDoProjectGroup from './ToDoProjectGroup.svelte'
  import ToDoDraggable from './ToDoDraggable.svelte'
  import ToDoElement from './ToDoElement.svelte'
  import { dragging } from '../dragging'
  import { calculateEventsDuration } from '../utils'

  export let mode: ToDosMode
  export let title: IntlString
  export let todos: WithLookup<ToDo>[]
  export let showTitle: boolean
  export let showDuration: boolean
  export let projects: IdMap<Project>

  function getAllWorkslots (todos: WithLookup<ToDo>[]): WorkSlot[] {
    const workslots: WorkSlot[] = []
    for (const todo of todos) {
      for (const workslot of (todo.$lookup?.workslots ?? []) as WorkSlot[]) {
        workslots.push(workslot)
      }
    }
    return workslots
  }

  let groups: Project[] | undefined = undefined
  let withoutProject: boolean = false

  $: id = `group:${title}`
  $: groups = updateGroups(todos, projects)

  const updateGroups = (_todos: WithLookup<ToDo>[], _projects: IdMap<Project>): Project[] | undefined => {
    let wp: boolean = false
    const _groups: Project[] = []
    for (const todo of _todos) {
      const id = todo.attachedSpace as Ref<Project>
      if (_projects.has(id)) {
        if (_groups.findIndex((gr) => gr._id === id) === -1) {
          const proj = _projects.get(id)
          if (proj) _groups.push(proj)
        }
      } else wp = true
    }
    withoutProject = wp
    return _groups
  }

  const hasProject = (proj: Ref<Space> | undefined): boolean => {
    return (proj && projects.has(proj as Ref<Project>)) ?? false
  }

  const client = getClient()

  $: draggingItem = $dragging.item
  $: draggingItemIndex = $dragging.itemIndex

  async function handleDrop (event: CustomEvent<{ event: DragEvent, index: number }>): Promise<void> {
    if (draggingItem === null || draggingItemIndex === null) return

    const droppingIndex = event.detail.index
    const [previousItem, nextItem] = [
      todos[draggingItemIndex < droppingIndex ? droppingIndex : droppingIndex - 1],
      todos[draggingItemIndex < droppingIndex ? droppingIndex + 1 : droppingIndex]
    ]

    const newRank = makeRank(previousItem?.rank, nextItem?.rank)
    await client.update(draggingItem, { rank: newRank })
  }

  $: events = getAllWorkslots(todos)
  $: duration = calculateEventsDuration(events)
</script>

{#if showTitle}
  <AccordionItem
    {id}
    label={title}
    size={'large'}
    bottomSpace={false}
    counter={todos.length}
    duration={showDuration ? duration : false}
    fixHeader
    background={'var(--theme-navpanel-color)'}
  >
    {#if groups}
      {#each groups as group}
        <ToDoProjectGroup
          todos={todos.filter((td) => td.attachedSpace === group._id)}
          project={group}
          groupName={title}
          {mode}
        />
      {/each}
    {/if}
    {#if withoutProject}
      <ToDoProjectGroup
        todos={todos.filter((td) => !hasProject(td.attachedSpace))}
        project={false}
        groupName={title}
        {mode}
      />
    {/if}
  </AccordionItem>
{:else}
  <div class="flex-col p-4 w-full">
    {#each todos as todo, index}
      <ToDoDraggable {todo} {index} groupName={title} projectId={false} on:drop={handleDrop}>
        <ToDoElement {todo} planned={mode !== 'unplanned'} />
      </ToDoDraggable>
    {/each}
  </div>
{/if}
