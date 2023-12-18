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

  import { Ref, SortingOrder, Status } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import {
    Button,
    Component,
    EditBox,
    Icon,
    IconAdd,
    IconCopy,
    IconDelete,
    IconFile,
    IconMoreV,
    Label,
    Location,
    Scroller,
    eventToHTMLElement,
    getCurrentResolvedLocation,
    navigate,
    resolvedLocationStore,
    showPopup
  } from '@hcengineering/ui'
  import { ContextMenu } from '@hcengineering/view-resources'
  import { onDestroy } from 'svelte'
  import plugin from '../../plugin'
  import CreateTaskType from '../taskTypes/CreateTaskType.svelte'
  import TaskTypeEditor from '../taskTypes/TaskTypeEditor.svelte'
  import TaskTypeIcon from '../taskTypes/TaskTypeIcon.svelte'
  import TaskTypeKindEditor from '../taskTypes/TaskTypeKindEditor.svelte'
  import TypeClassEditor from '../taskTypes/TypeClassEditor.svelte'

  export let type: ProjectType
  export let descriptor: ProjectTypeDescriptor | undefined

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

  $: statusCounter = tasks.reduce(
    (map, task) => map.set(task.status, (map.get(task.status) ?? 0) + 1),
    new Map<Ref<Status>, number>()
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
    navigate(loc)
  }
</script>

<div class="h-full flex-col w-full">
  {#if type !== undefined && descriptor !== undefined}
    <div class="p-2 bottom-divider flex-row-center">
      <div class="button-group flex-row-center right-divider pr-2">
        <Button
          icon={IconDelete}
          kind={'regular'}
          on:click={(ev) => {
            // Ask for delete
          }}
        />
        <Button
          icon={IconCopy}
          kind={'regular'}
          on:click={(ev) => {
            // Do copy of type
          }}
        />
        <Button
          icon={IconMoreV}
          kind={'regular'}
          on:click={(ev) => {
            showPopup(ContextMenu, { object: type }, eventToHTMLElement(ev), () => {})
          }}
        />
      </div>
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="fs-title ml-2 flex-row-center">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="hover-trans"
          on:click={() => {
            selectTaskType(undefined)
          }}
        >
          <Label label={plugin.string.ProjectType} />
        </div>
        {#if selectedTaskType !== undefined}
          <span class="p-1">/</span>
          {selectedTaskType.name}
        {/if}
      </div>
    </div>
    <div class="h-full flex-row-top w-full justify-center">
      <div class="h-full editorBox flex-col">
        <Scroller padding={'0 1rem'} noStretch shrink>
          {#if selectedTaskType === undefined}
            <!-- <div class="flex-col">Navigation</div> -->
            <div class="flex-grow h-full">
              <div class="p-4 flex-col">
                <div>
                  <div class="flex-row-center flex-between mb-2">
                    <div>
                      <Component is={descriptor.icon} props={{ size: 'large' }} />
                    </div>
                    <div class="flex-row-center no-word-wrap">
                      <Icon icon={IconFile} size={'small'} />
                      {projects.length} projects
                    </div>
                  </div>
                  <EditBox
                    kind={'large-style'}
                    value={type?.name ?? ''}
                    on:blur={(evt) => {
                      if (type !== undefined) {
                        void client.diffUpdate(type, { name: evt.detail })
                      }
                    }}
                  />
                  <div class="p-2">
                    <EditBox
                      placeholder={getEmbeddedLabel('Description')}
                      kind={'small-style'}
                      bind:value={type.shortDescription}
                      on:change={() => onShortDescriptionChange(type?.shortDescription ?? '')}
                    />
                  </div>
                  {#if descriptor?.editor}
                    <Component is={descriptor.editor} props={{ type }} />
                  {/if}
                </div>

                <div class="panelBox flex-col row">
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <div class="fs-title flex flex-between bottom-divider">
                    <div class="trans-title">
                      <Label label={getEmbeddedLabel('Task types')} />
                    </div>
                    <div class="p-1">
                      <Button
                        icon={IconAdd}
                        kind={'primary'}
                        size={'small'}
                        on:click={(event) => {
                          showPopup(CreateTaskType, { type, descriptor }, 'top')
                        }}
                      />
                    </div>
                  </div>
                  <div class="mt-1">
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    {#each taskTypes as taskType}
                      <!-- svelte-ignore a11y-click-events-have-key-events -->
                      <div
                        class="flex-grow p-2 antiButton sh-round flex-row-center"
                        class:regular={taskType._id === selectedTaskTypeId}
                        class:ghost={taskType._id !== selectedTaskTypeId}
                        on:click|stopPropagation={() => {
                          selectTaskType(taskType._id)
                        }}
                      >
                        <div class="p-2">
                          <TaskTypeIcon value={taskType} size={'small'} />
                        </div>
                        <div class="fs-title">
                          {taskType.name}
                        </div>
                        <div class="ml-2 text-sm">
                          <TaskTypeKindEditor readonly kind={taskType.kind} buttonKind={'link'} />
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>

                <ComponentExtensions extension={task.extensions.ProjectEditorExtension} props={{ type }} />

                <div class="panelBox flex-col row">
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <div class="fs-title flex flex-between bottom-divider">
                    <div class="trans-title">
                      <Label label={getEmbeddedLabel('Collections')} />
                    </div>
                    <div class="p-1">
                      <Button icon={IconAdd} kind={'primary'} size={'small'} on:click={(event) => {}} />
                    </div>
                  </div>
                  <div class="mt-1">
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                  </div>
                </div>

                <div class="panelBox flex-col row">
                  <div class="mt-1">
                    <TypeClassEditor ofClass={descriptor.baseClass} _class={type.targetClass} />
                  </div>
                </div>
              </div>
            </div>
          {:else}
            <TaskTypeEditor
              taskType={selectedTaskType}
              projectType={type}
              {taskTypes}
              {taskTypeCounter}
              {statusCounter}
            />
          {/if}
        </Scroller>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .row {
    // border-bottom: 1px solid var(--theme-list-border-color);
    // border-top: 1px solid var(--theme-list-border-color);
    width: 100%;
  }
  .panelBox {
    margin-top: 1rem;
    padding: 0.5rem;
    // TODO: Need to update it
    border: 1px solid var(--theme-button-border);
    background: var(--theme-button-default);
    border-radius: 8px;
  }
  .editorBox {
    max-width: 1024px;
    min-width: 768px;
  }
</style>
