<script lang="ts">
  import { WithLookup, IdMap, Ref, Space } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { ToDo, WorkSlot } from '@hcengineering/time'
  import time from '../plugin'
  import { createEventDispatcher } from 'svelte'
  import ToDoDuration from './ToDoDuration.svelte'
  import ToDoElement from './ToDoElement.svelte'
  import {
    AccordionItem,
    IconWithEmoji,
    getPlatformColorDef,
    getPlatformColorForTextDef,
    themeStore
  } from '@hcengineering/ui'
  import { ToDosMode } from '..'
  import { Project } from '@hcengineering/tracker'
  import view from '@hcengineering/view'

  export let mode: ToDosMode
  export let title: IntlString
  export let todos: WithLookup<ToDo>[]
  export let showTitle: boolean
  export let showDuration: boolean
  export let largeSize: boolean = false
  export let projects: IdMap<Project>

  const dispatch = createEventDispatcher()

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
</script>

{#if showTitle}
  <AccordionItem
    label={title}
    size={'large'}
    bottomSpace={false}
    counter={todos.length}
    duration={showDuration}
    isOpen
    fixHeader
    background={'var(--theme-navpanel-color)'}
  >
    <svelte:fragment slot="duration">
      <ToDoDuration events={getAllWorkslots(todos)} />
    </svelte:fragment>
    {#if groups}
      {#each groups as group}
        <AccordionItem
          icon={group.icon === view.ids.IconWithEmoji ? IconWithEmoji : group.icon}
          iconProps={group.icon === view.ids.IconWithEmoji
            ? { icon: group.color }
            : {
                fill:
                  group.color !== undefined
                    ? getPlatformColorDef(group.color, $themeStore.dark).icon
                    : getPlatformColorForTextDef(group.name, $themeStore.dark).icon
              }}
          title={group.name}
          size={'medium'}
          isOpen
          nested
        >
          {#each todos.filter((td) => td.attachedSpace === group._id) as todo}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="step-tb125" draggable={true} on:dragend on:dragstart={() => dispatch('dragstart', todo)}>
              <ToDoElement {todo} size={largeSize ? 'large' : 'small'} planned={mode !== 'unplanned'} />
            </div>
          {/each}
        </AccordionItem>
      {/each}
    {/if}
    {#if withoutProject}
      <AccordionItem label={time.string.WithoutProject} size={'medium'} isOpen nested>
        {#each todos.filter((td) => !hasProject(td.attachedSpace)) as todo}
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="step-tb125" draggable={true} on:dragend on:dragstart={() => dispatch('dragstart', todo)}>
            <ToDoElement {todo} size={largeSize ? 'large' : 'small'} planned={mode !== 'unplanned'} />
          </div>
        {/each}
      </AccordionItem>
    {/if}
  </AccordionItem>
{:else}
  <div class="flex-col p-4 w-full">
    {#each todos as todo}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="step-tb125" draggable={true} on:dragend on:dragstart={() => dispatch('dragstart', todo)}>
        <ToDoElement {todo} size={largeSize ? 'large' : 'small'} planned={mode !== 'unplanned'} />
      </div>
    {/each}
  </div>
{/if}
