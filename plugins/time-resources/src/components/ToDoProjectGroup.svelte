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
  import type { IntlString } from '@hcengineering/platform'
  import type { Project } from '@hcengineering/tracker'
  import type { ToDo } from '@hcengineering/time'
  import type { ToDosMode } from '..'
  import {
    AccordionItem,
    IconWithEmoji,
    getPlatformColorDef,
    getPlatformColorForTextDef,
    themeStore
  } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import { makeRank } from '@hcengineering/task'
  import tracker from '@hcengineering/tracker'
  import view from '@hcengineering/view'
  import ToDoDraggable from './ToDoDraggable.svelte'
  import ToDoElement from './ToDoElement.svelte'
  import time from '../plugin'
  import { dragging } from '../dragging'

  export let todos: ToDo[]
  export let project: Project | false | undefined = undefined
  export let mode: ToDosMode
  export let groupName: IntlString

  const client = getClient()

  let projectId: string | false

  $: id = project === undefined ? groupName : `group:${groupName}_project:${project === false ? 'none' : project?._id}`
  $: icon = project
    ? project.icon === view.ids.IconWithEmoji
      ? IconWithEmoji
      : project.icon ?? tracker.icon.Home
    : undefined
  $: iconProps = project
    ? project.icon === view.ids.IconWithEmoji
      ? { icon: project.color }
      : {
          fill:
            project.color !== undefined
              ? getPlatformColorDef(project.color, $themeStore.dark).icon
              : getPlatformColorForTextDef(project.name, $themeStore.dark).icon
        }
    : undefined
  $: title = project ? project.name : undefined
  $: label = title ? undefined : time.string.WithoutProject
  $: projectId = project ? project._id : false

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
</script>

<AccordionItem {id} {icon} {iconProps} {title} {label} size={'medium'} nested hiddenHeader={project === false}>
  {#each todos as todo, index}
    <ToDoDraggable {todo} {index} {groupName} {projectId} on:drop={handleDrop}>
      <ToDoElement {todo} planned={mode !== 'unplanned'} />
    </ToDoDraggable>
  {/each}
</AccordionItem>
