<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022, 2023 Hardcore Engineering Inc.
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
  import { ComponentExtensions, createQuery, getClient } from '@hcengineering/presentation'
  import task, { Project, ProjectType, ProjectTypeDescriptor, Task, TaskType } from '@hcengineering/task'
  import { createEventDispatcher, onDestroy } from 'svelte'

  import { Ref, SortingOrder } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import setting from '@hcengineering/setting'
  import { ClassAttributes, clearSettingsStore, settingsStore } from '@hcengineering/setting-resources'
  import {
    Breadcrumbs,
    ButtonIcon,
    Component,
    Header,
    IconAdd,
    IconCopy,
    IconDelete,
    IconDescription,
    IconFolder,
    IconMoreV,
    IconSquareExpand,
    Label,
    Location,
    ModernButton,
    ModernEditbox,
    NavItem,
    Scroller,
    Separator,
    TextArea,
    defineSeparators,
    eventToHTMLElement,
    getCurrentResolvedLocation,
    navigate,
    resolvedLocationStore,
    secondNavSeparators,
    showPopup
  } from '@hcengineering/ui'
  import { ContextMenu } from '@hcengineering/view-resources'
  import plugin from '../../plugin'
  import IconLayers from '../icons/Layers.svelte'
  import CreateTaskType from '../taskTypes/CreateTaskType.svelte'
  import TaskTypeEditor from '../taskTypes/TaskTypeEditor.svelte'
  import TaskTypeIcon from '../taskTypes/TaskTypeIcon.svelte'
  import TaskTypeKindEditor from '../taskTypes/TaskTypeKindEditor.svelte'

  export let type: ProjectType
  export let descriptor: ProjectTypeDescriptor | undefined
  export let visibleNav: boolean = true

  const dispatch = createEventDispatcher()

  const client = getClient()
  const query = createQuery()

  const projectQuery = createQuery()

  $: if (descriptor === undefined) {
    void client.findOne(task.class.ProjectTypeDescriptor, { _id: type.descriptor }).then((res) => {
      descriptor = res
    })
  }

  let taskTypes: TaskType[] = []
  let projects: Project[] = []

  $: query.query(
    task.class.TaskType,
    { _id: { $in: type?.tasks ?? [] } },
    (res) => {
      taskTypes = res
    },
    { sort: { _id: SortingOrder.Ascending } }
  )
  async function onShortDescriptionChange (value: string): Promise<void> {
    if (type !== undefined) {
      await client.diffUpdate(type, { shortDescription: value })
    }
  }

  $: projectQuery.query(task.class.Project, { type: type._id }, (res) => {
    projects = res
  })

  const statsQuery = createQuery()

  let tasks: Task[] = []

  $: statsQuery.query(
    task.class.Task,
    { kind: { $in: taskTypes.map((it) => it._id) } },
    (res) => {
      tasks = res
    },
    {
      projection: {
        _id: 1,
        _class: 1,
        space: 1,
        status: 1,
        kind: 1
      }
    }
  )

  // $: spaceCounter = tasks.reduce(
  //   (map, task) => map.set(task.space, (map.get(task.space) ?? 0) + 1),
  //   new Map<Ref<Space>, number>()
  // )

  $: taskTypeCounter = tasks.reduce(
    (map, task) => map.set(task.kind, (map.get(task.kind) ?? 0) + 1),
    new Map<Ref<TaskType>, number>()
  )

  let selectedTaskTypeId: Ref<TaskType> | undefined

  $: selectedTaskType = taskTypes.find((it) => it._id === selectedTaskTypeId)

  onDestroy(
    resolvedLocationStore.subscribe((loc) => {
      void (async (loc: Location): Promise<void> => {
        selectedTaskTypeId = loc.path[5] as Ref<TaskType>
      })(loc)
    })
  )

  function selectTaskType (id: string | undefined): void {
    const loc = getCurrentResolvedLocation()
    if (id !== undefined) {
      loc.path[5] = id
      loc.path.length = 6
    } else {
      loc.path.length = 5
    }
    selectedTaskTypeId = id as Ref<TaskType>
    clearSettingsStore()
    navigate(loc)
  }
  $: items =
    selectedTaskType !== undefined
      ? [
          { label: plugin.string.ProjectType, icon: descriptor?.icon },
          { title: selectedTaskType.name, icon: selectedTaskType.icon }
        ]
      : [{ label: plugin.string.ProjectType, icon: descriptor?.icon }]

  let scroller: Scroller
  const navigator: {
    id: string
    label: IntlString
    element?: HTMLElement
  }[] = [
    { id: 'properties', label: setting.string.Properties },
    { id: 'tasktypes', label: setting.string.TaskTypes },
    { id: 'automations', label: setting.string.Automations },
    { id: 'collections', label: setting.string.Collections }
  ]

  defineSeparators('typeSettings', secondNavSeparators)
</script>

{#if type !== undefined && descriptor !== undefined}
  <Header minimize={!visibleNav} on:resize={(event) => dispatch('change', event.detail)}>
    <ButtonIcon
      icon={IconCopy}
      size={'small'}
      kind={'secondary'}
      disabled
      on:click={(ev) => {
        // Do copy of type
      }}
    />
    <ButtonIcon
      icon={IconDelete}
      size={'small'}
      kind={'secondary'}
      disabled
      on:click={(ev) => {
        // Ask for delete
      }}
    />
    <ButtonIcon
      icon={IconMoreV}
      size={'small'}
      kind={'secondary'}
      on:click={(ev) => {
        showPopup(ContextMenu, { object: type }, eventToHTMLElement(ev), () => {})
      }}
    />
    <Breadcrumbs
      {items}
      size={'large'}
      selected={selectedTaskType !== undefined ? 1 : 0}
      on:select={(event) => {
        if (event.detail === 0) selectTaskType(undefined)
      }}
    >
      <!-- afterLabel={plugin.string.Published} -->
      <!-- <span slot="afterLabel">{dateStr}</span> -->
    </Breadcrumbs>
    <!-- <svelte:fragment slot="actions">
      <div class="hulyHeader-buttonsGroup__label font-regular-12">
        <Label label={plugin.string.LastSave} />
        <span>{dateStr}</span>
      </div>
      <ModernButton kind={'secondary'} label={ui.string.SaveDraft} size={'small'} />
      <ModernButton kind={'primary'} icon={IconSend} label={ui.string.Publish} size={'small'} />
    </svelte:fragment> -->
  </Header>
  <div class="hulyComponent-content__container columns">
    {#if selectedTaskTypeId === undefined}
      <div class="hulyComponent-content__column">
        <div class="hulyComponent-content__navHeader">
          <div class="hulyComponent-content__navHeader-menu">
            <ButtonIcon kind={'tertiary'} icon={IconDescription} size={'small'} inheritColor />
          </div>
        </div>
        {#each navigator as navItem, i (navItem.id)}
          <NavItem
            type={'type-anchor-link'}
            label={navItem.label}
            on:click={() => {
              if (i === 0) scroller.scroll(0)
              else navItem.element?.scrollIntoView()
            }}
          />
        {/each}
      </div>
      <Separator name={'typeSettings'} index={0} color={'transparent'} />
    {/if}
    <div class="hulyComponent-content__column content">
      <Scroller bind:this={scroller} align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content gap">
          {#if selectedTaskType === undefined}
            <div class="hulyComponent-content__column-group">
              <div class="hulyComponent-content__header">
                <ButtonIcon icon={descriptor.icon} size={'large'} kind={'secondary'} />
                <ModernButton
                  icon={IconSquareExpand}
                  label={plugin.string.CountProjects}
                  labelParams={{ count: projects.length }}
                  disabled={projects.length === 0}
                  kind={'tertiary'}
                  size={'medium'}
                  hasMenu
                />
              </div>
              <ModernEditbox
                kind={'ghost'}
                size={'large'}
                label={plugin.string.ProjectTypeTitle}
                value={type?.name ?? ''}
                on:blur={(evt) => {
                  if (type !== undefined) {
                    void client.diffUpdate(type, { name: evt.detail })
                  }
                }}
              />
              <TextArea
                placeholder={plugin.string.Description}
                width={'100%'}
                height={'4.5rem'}
                margin={'var(--spacing-1) var(--spacing-2)'}
                noFocusBorder
                bind:value={type.shortDescription}
                on:change={() => onShortDescriptionChange(type?.shortDescription ?? '')}
              />
              {#if descriptor?.editor}
                <Component is={descriptor.editor} props={{ type }} />
              {/if}
            </div>

            <ClassAttributes ofClass={descriptor.baseClass} _class={type.targetClass} showHierarchy />

            <div bind:this={navigator[1].element} class="hulyTableAttr-container">
              <div class="hulyTableAttr-header font-medium-12">
                <IconLayers size={'small'} />
                <span><Label label={setting.string.TaskTypes} /></span>
                <ButtonIcon
                  kind={'primary'}
                  icon={IconAdd}
                  size={'small'}
                  on:click={(ev) => {
                    $settingsStore = { id: 'createTaskType', component: CreateTaskType, props: { type, descriptor } }
                    // showPopup(CreateTaskType, { type, descriptor }, 'top')
                  }}
                />
              </div>
              {#if taskTypes.length}
                <div class="hulyTableAttr-content task">
                  {#each taskTypes as taskType}
                    <button
                      class="hulyTableAttr-content__row"
                      on:click|stopPropagation={() => {
                        selectTaskType(taskType._id)
                      }}
                    >
                      <div class="hulyTableAttr-content__row-icon-wrapper">
                        <TaskTypeIcon value={taskType} size={'small'} />
                      </div>
                      {#if taskType.name}
                        <div class="hulyTableAttr-content__row-label font-medium-14">
                          {taskType.name}
                        </div>
                      {/if}
                      <div class="hulyTableAttr-content__row-label grow dark font-regular-14">
                        <TaskTypeKindEditor readonly kind={taskType.kind} />
                      </div>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>

            <div bind:this={navigator[2].element} class="flex-col gapV-8">
              <ComponentExtensions extension={task.extensions.ProjectEditorExtension} props={{ type }} />
            </div>

            <div bind:this={navigator[3].element} class="hulyTableAttr-container">
              <div class="hulyTableAttr-header font-medium-12">
                <IconFolder size={'small'} />
                <span><Label label={setting.string.Collections} /></span>
                <ButtonIcon kind={'primary'} icon={IconAdd} size={'small'} on:click={() => {}} />
              </div>
            </div>
          {:else}
            <TaskTypeEditor taskType={selectedTaskType} projectType={type} {taskTypes} {taskTypeCounter} />
          {/if}
        </div>
      </Scroller>
    </div>
  </div>
{/if}

<style lang="scss">
  .gap {
    gap: var(--spacing-4);
  }
</style>
