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
  import { Visibility } from '@hcengineering/calendar'
  import calendar from '@hcengineering/calendar-resources/src/plugin'
  import core, { Class, Ref, Space, getCurrentAccount, Markup } from '@hcengineering/core'
  import { SpaceSelector, getClient, createQuery } from '@hcengineering/presentation'
  import tags from '@hcengineering/tags'
  import task from '@hcengineering/task'
  import { StyledTextBox } from '@hcengineering/text-editor-resources'
  import { ModernEditbox, CheckBox, Component, IconClose, Label, Modal, Spinner, ButtonIcon } from '@hcengineering/ui'
  import { ToDo, ToDoPriority } from '@hcengineering/time'
  import { createEventDispatcher } from 'svelte'
  import time from '../plugin'
  import DueDateEditor from './DueDateEditor.svelte'
  import PriorityEditor from './PriorityEditor.svelte'
  import TodoWorkslots from './TodoWorkslots.svelte'
  import { VisibilityEditor } from '@hcengineering/calendar-resources'

  // export let object: ToDo
  export let _id: Ref<ToDo>
  export let _class: Ref<Class<ToDo>>
  export let embedded: boolean = false

  let object: ToDo
  let title: string
  let description: Markup
  let countTag: number = 0

  const dispatch = createEventDispatcher()
  const queryClient = createQuery()
  const client = getClient()

  $: _id !== undefined &&
    _class !== undefined &&
    queryClient.query<ToDo>(_class, { _id }, async (result) => {
      ;[object] = result
      if (object !== undefined) {
        title = object.title
        description = object.description
      }
    })

  export function canClose (): boolean {
    return true
  }

  async function updateName () {
    if (object.title !== title) {
      await client.update(object, { title })
    }
  }

  async function updateDescription () {
    if (object.description !== description) {
      await client.update(object, { description })
    }
  }

  async function markDone () {
    object.doneOn = object.doneOn == null ? Date.now() : null
    await client.update(object, { doneOn: object.doneOn })
  }

  async function dueDateChange (value: Date | null) {
    const dueDate = value != null ? value.getTime() : null
    await client.update(object, { dueDate })
    object.dueDate = dueDate
  }

  async function priorityChange (priority: ToDoPriority) {
    await client.update(object, { priority })
    object.priority = priority
  }

  async function visibilityChange (visibility: Visibility) {
    await client.update(object, { visibility })
    object.visibility = visibility
  }

  async function spaceChange (space: Space | null) {
    const oldSpace = object.attachedSpace ?? undefined
    const newSpace = space?._id ?? undefined
    if (newSpace !== oldSpace) {
      await client.update(object, { attachedSpace: newSpace })
      object.attachedSpace = newSpace
    }
  }
</script>

<Modal type={'type-component'} padding={'0'}>
  <svelte:fragment slot="beforeTitle">
    <div class="flex-center flex-no-shrink min-w-6 min-h-6">
      {#if object}
        <CheckBox on:value={markDone} checked={object.doneOn != null} kind={'todo'} />
      {:else}
        <Spinner size={'small'} />
      {/if}
    </div>
  </svelte:fragment>
  <svelte:fragment slot="title">
    {#if object}
      <PriorityEditor value={object.priority} on:change={(e) => priorityChange(e.detail)} />
      <Component
        is={tags.component.DocTagsEditor}
        props={{ object, targetClass: time.class.ToDo, type: 'type-button-only' }}
        on:change={(event) => {
          if (event.detail !== undefined) countTag = event.detail
        }}
      />
      <VisibilityEditor
        value={object.visibility}
        size={'small'}
        disabled={object._class === time.class.ProjectToDo}
        on:change={(e) => visibilityChange(e.detail)}
      />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="actions">
    <ButtonIcon icon={IconClose} kind={'tertiary'} size={'small'} on:click={() => dispatch('close')} />
  </svelte:fragment>

  {#if object}
    <div class="top-content">
      <ModernEditbox
        bind:value={title}
        label={time.string.AddTitle}
        kind={'ghost'}
        size={'large'}
        focusIndex={10001}
        on:change={updateName}
      />
      <div class="min-h-16 px-4">
        <StyledTextBox
          alwaysEdit={true}
          isScrollable={false}
          showButtons={false}
          placeholder={calendar.string.Description}
          bind:content={description}
          on:value={updateDescription}
        />
      </div>
      <div class="emphasized">
        <div class="flex-row-center flex-gap-4">
          <span class="font-medium"><Label label={time.string.AddTo} /></span>
          <SpaceSelector
            _class={task.class.Project}
            query={{ archived: false, members: getCurrentAccount().uuid }}
            label={core.string.Space}
            kind={'regular'}
            size={'medium'}
            allowDeselect
            autoSelect={false}
            readonly={object._class === time.class.ProjectToDo}
            space={object.attachedSpace}
            on:object={(e) => spaceChange(e.detail)}
          />
        </div>
      </div>
    </div>
    {#if countTag}
      <div class="labels-content">
        <Component
          is={tags.component.DocTagsEditor}
          props={{ object, targetClass: time.class.ToDo, type: 'type-content-only' }}
        />
      </div>
    {/if}
    <div class="slots-content">
      <div class="flex-row-top justify-between items-center flex-gap-2">
        <span class="font-caps-medium-12 slots-content-title">
          <Label label={time.string.WorkSchedule} />
        </span>
        <div class="flex-row-center gap-2">
          <DueDateEditor value={object.dueDate} on:change={(e) => dueDateChange(e.detail)} />
        </div>
      </div>
      <TodoWorkslots todo={object} />
    </div>
  {/if}
</Modal>

<style lang="scss">
  .labels-content,
  .slots-content,
  .top-content,
  .emphasized {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    min-width: 0;
    min-height: 0;
  }
  .top-content {
    padding: var(--spacing-3) var(--spacing-2) var(--spacing-4);
  }
  .emphasized {
    gap: var(--spacing-1_5);
    margin: var(--spacing-2_5) var(--spacing-2) 0;
    padding: var(--spacing-2);
    color: var(--global-primary-TextColor);
    background-color: var(--theme-bg-accent-color);
    border-radius: var(--medium-BorderRadius);
  }
  .labels-content {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    padding: var(--spacing-1_5) var(--spacing-4);
    width: 100%;
    border-top: 1px solid var(--theme-divider-color);
  }
  .slots-content {
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-4);
    min-width: 0;
    border-top: 1px solid var(--theme-divider-color);
  }
  .eventPopup-container {
    display: flex;
    flex-direction: column;
    padding-top: 2rem;
    padding-bottom: 2rem;
    max-width: 40rem;
    min-width: 40rem;
    min-height: 0;
    background: var(--theme-popup-color);
    border-radius: 1rem;
    box-shadow: var(--theme-popup-shadow);

    .header {
      flex-shrink: 0;
      padding-right: 2rem;
      padding-left: 2rem;
    }

    .block {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      padding-top: 1rem;
      padding-bottom: 1rem;
      padding-right: 2rem;
      padding-left: 2rem;

      &:not(.end) {
        border-bottom: 1px solid var(--theme-divider-color);
      }
    }
  }
</style>
