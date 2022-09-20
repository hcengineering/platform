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
  import type { WithLookup } from '@hcengineering/core'
  import type { Task, TodoItem } from '@hcengineering/task'
  import task from '@hcengineering/task'
  import { Table } from '@hcengineering/view-resources'
  import plugin from '../../plugin'

  export let value: WithLookup<Task>

  $: todos = (value.$lookup?.todoItems as TodoItem[]) ?? []
</script>

<div class="flex-col">
  {#if todos.length > 0}
    <Table
      _class={task.class.TodoItem}
      config={[
        { key: 'name', label: plugin.string.TodoName },
        'dueTo',
        { key: 'done', presenter: plugin.component.TodoStatePresenter, label: plugin.string.TodoState }
      ]}
      options={{}}
      query={{ attachedTo: value._id }}
    />
  {/if}
</div>
