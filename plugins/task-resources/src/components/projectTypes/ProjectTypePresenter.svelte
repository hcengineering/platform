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
  import task, { type ProjectType } from '@hcengineering/task'
  import { Icon } from '@hcengineering/ui'
  import { typeStore } from '../..'

  export let value: ProjectType | Ref<ProjectType> | undefined

  $: descriptor = getClient().getModel().findAllSync(task.class.ProjectTypeDescriptor, {}).shift()

  $: _value = typeof value === 'string' ? $typeStore.get(value) : value
</script>

{#if _value !== undefined}
  <span class="label flex-row-center gap-1 ml-3 no-word-wrap">
    {#if descriptor?.icon}
      <Icon icon={descriptor?.icon} size={'small'} />
    {/if}
    <span class:ml-1={descriptor?.icon !== undefined}>
      {_value.name}
    </span>
  </span>
{/if}
