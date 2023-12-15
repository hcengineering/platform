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
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import type { TaskType } from '@hcengineering/task'
  import { taskTypeStore, typeStore, selectedTypeStore } from '../../'
  import TaskTypeIcon from './TaskTypeIcon.svelte'

  export let value: TaskType | Ref<TaskType> | undefined

  $: _value = typeof value === 'string' ? $taskTypeStore.get(value) : value

  $: _parent = _value !== undefined ? $typeStore.get(_value.parent) : undefined

  $: _class = _value?.ofClass !== undefined ? getClient().getHierarchy().getClass(_value.ofClass) : undefined
</script>

{#if _class !== undefined && _value !== undefined}
  <span class="label flex-row-center gap-1 ml-3">
    <TaskTypeIcon value={_value} size={'small'} />
    <span class="flex-row-center no-word-wrap" class:ml-1={_class.icon !== undefined}>
      {#if $selectedTypeStore !== _parent?._id}
        {_parent?.name}
        <div>/</div>
      {/if}
      {_value.name}
    </span>
  </span>
{/if}
