<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Ref } from '@hcengineering/core'
  import type { TaskType } from '@hcengineering/task'
  import view from '@hcengineering/view'
  import { taskTypeStore } from '../../'
  import TaskTypeIcon from './TaskTypeIcon.svelte'
  import { getClient } from '@hcengineering/presentation'
  import task from '@hcengineering/task'

  export let value: TaskType | Ref<TaskType> | undefined

  $: _value = typeof value === 'string' ? $taskTypeStore.get(value) : value
  $: descriptor = getClient().getModel().findAllSync(task.class.TaskTypeDescriptor, { _id: _value?.descriptor }).shift()
  $: visible = !(_value?.icon === descriptor?.icon)
</script>

{#if _value !== undefined && visible}
  <span class="label flex-row-center gap-1 ml-3">
    <TaskTypeIcon value={_value} size={'small'} />
  </span>
{/if}
