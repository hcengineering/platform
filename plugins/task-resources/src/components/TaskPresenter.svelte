<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { getClient } from '@hcengineering/presentation'
  import type { Task } from '@hcengineering/task'
  import { Icon } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import task from '../plugin'

  export let value: Task
  export let inline: boolean = false

  const client = getClient()
  const shortLabel = client.getHierarchy().getClass(value._class).shortLabel
</script>

{#if value && shortLabel}
  <DocNavLink object={value} {inline}>
    <div class="flex-presenter" class:inline-presenter={inline}>
      <div class="icon">
        <Icon icon={task.icon.Task} size={'small'} />
      </div>
      <span class="label nowrap"
        >{#if shortLabel}{shortLabel}-{/if}{value.number}</span
      >
    </div>
  </DocNavLink>
{/if}
