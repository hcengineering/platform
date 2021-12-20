<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Ref, Space, Doc, Class } from '@anticrm/core'
  import type { TodoItem } from '@anticrm/task'
  import { createQuery } from '@anticrm/presentation'
  import { CircleButton, IconAdd, showPopup, Label } from '@anticrm/ui'
  import CreateTodo from './CreateTodo.svelte'
  import { Table } from '@anticrm/view-resources'

  import task from '../../plugin'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>

  let todos: TodoItem[] = []

  const query = createQuery()
  $: query.query(task.class.TodoItem, { attachedTo: objectId }, result => { todos = result })

  const createApp = (ev: MouseEvent): void => {
    showPopup(CreateTodo, { objectId, _class, space }, ev.target as HTMLElement)
  }
</script>

<div class="applications-container">
  <div class="flex-row-center">
    <div class="title">To Do's</div>
    <CircleButton icon={IconAdd} size={'small'} selected on:click={createApp} />
  </div>
  {#if todos.length > 0}
    <Table 
      _class={task.class.TodoItem}
      config={[{ key: '', label: task.string.TodoName }, 'dueTo', { key: 'done', presenter: task.component.TodoStatePresenter, label: task.string.TodoState }]}
      options={
        {
          // lookup: {
          // }
        }
      }
      query={ { attachedTo: objectId } }
    />
  {:else}
    <div class="flex-col-center mt-5 createapp-container">
      <div class="small-text">
        <a href={'#'} on:click={createApp}><Label label={task.string.NoTodoItems} /></a>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .applications-container {
    display: flex;
    flex-direction: column;

    .title {
      margin-right: .75rem;
      font-weight: 500;
      font-size: 1.25rem;
      color: var(--theme-caption-color);
    }
  }

  .createapp-container {
    padding: 1rem;
    color: var(--theme-caption-color);
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: .75rem;
  }
</style>
