<script lang="ts">
  import { Ref, SortingOrder } from '@hcengineering/core'
  import task, { ProjectType, TaskType } from '@hcengineering/task'
  import { CheckBox, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import plugin from '../../plugin'

  export let currentProjectType: Ref<ProjectType>
  export let selectedTaskTypes: Ref<TaskType>[] = []

  const dispatch = createEventDispatcher()
  getClient() // Initialize client for queries

  let allTaskTypes: TaskType[] = []
  let projectTypes: ProjectType[] = []

  // Query all TaskTypes except those already in current ProjectType
  const taskTypeQuery = createQuery()
  $: taskTypeQuery.query(
    task.class.TaskType,
    { parent: { $ne: currentProjectType } },
    (res) => {
      allTaskTypes = res
    },
    { sort: { name: SortingOrder.Ascending } }
  )

  // Query all ProjectTypes for grouping
  const projectTypeQuery = createQuery()
  $: projectTypeQuery.query(
    task.class.ProjectType,
    {},
    (res) => {
      projectTypes = res
    }
  )

  // Group TaskTypes by their parent ProjectType
  $: groupedTaskTypes = projectTypes
    .filter((pt) => pt._id !== currentProjectType)
    .map((pt) => ({
      projectType: pt,
      taskTypes: allTaskTypes.filter((tt) => tt.parent === pt._id)
    }))
    .filter((group) => group.taskTypes.length > 0)

  function toggleSelection (taskTypeId: Ref<TaskType>): void {
    const index = selectedTaskTypes.indexOf(taskTypeId)
    if (index === -1) {
      selectedTaskTypes = [...selectedTaskTypes, taskTypeId]
    } else {
      selectedTaskTypes = selectedTaskTypes.filter((id) => id !== taskTypeId)
    }
    dispatch('change', selectedTaskTypes)
  }

  function isSelected (taskTypeId: Ref<TaskType>): boolean {
    return selectedTaskTypes.includes(taskTypeId)
  }
</script>

<div class="link-selector">
  <div class="header">
    <Label label={plugin.string.SelectTaskTypesToClone} />
  </div>

  {#if groupedTaskTypes.length === 0}
    <div class="empty">
      <Label label={plugin.string.NoTaskTypesAvailable} />
    </div>
  {:else}
    <div class="groups">
      {#each groupedTaskTypes as group}
        <div class="group">
          <div class="group-header">
            {group.projectType.name}
          </div>
          <div class="group-items">
            {#each group.taskTypes as taskType}
              <button
                class="task-type-item"
                class:selected={isSelected(taskType._id)}
                on:click={() => { toggleSelection(taskType._id) }}
              >
                <CheckBox checked={isSelected(taskType._id)} />
                <span class="name">{taskType.name}</span>
                <span class="kind">({taskType.kind})</span>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if selectedTaskTypes.length > 0}
    <div class="selection-count">
      {selectedTaskTypes.length} selected
    </div>
  {/if}
</div>

<style lang="scss">
  .link-selector {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 400px;
    overflow-y: auto;
  }

  .header {
    font-weight: 500;
    color: var(--theme-content-color);
  }

  .empty {
    color: var(--theme-halfcontent-color);
    padding: 1rem;
    text-align: center;
  }

  .groups {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .group {
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .group-header {
    background: var(--theme-bg-accent-color);
    padding: 0.5rem 1rem;
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--theme-halfcontent-color);
  }

  .group-items {
    display: flex;
    flex-direction: column;
  }

  .task-type-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: background-color 0.15s;

    &:hover {
      background: var(--theme-bg-accent-hover);
    }

    &.selected {
      background: var(--theme-bg-accent-color);
    }

    .name {
      flex: 1;
      color: var(--theme-content-color);
    }

    .kind {
      color: var(--theme-halfcontent-color);
      font-size: 0.875rem;
    }
  }

  .selection-count {
    padding: 0.5rem;
    text-align: center;
    background: var(--theme-bg-accent-color);
    border-radius: 0.25rem;
    font-size: 0.875rem;
    color: var(--theme-accent-color);
  }
</style>
