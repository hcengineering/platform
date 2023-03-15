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
  import type { Issue, Task } from '@hcengineering/task'
  import { Icon } from '@hcengineering/ui'
  import task from '../plugin'

  export let value: Task

  const client = getClient()
  const shortLabel = client.getHierarchy().getClass(value._class).shortLabel

  let name: string | undefined = undefined

  $: if (client.getHierarchy().isDerived(value._class, task.class.Issue)) {
    name = (value as Issue).name
  }
</script>

<div class="flex item">
  <Icon icon={task.icon.Task} size={'large'} />
  <div class="ml-2">
    {#if shortLabel}{shortLabel}-{/if}{value.number}
  </div>
  {#if name}
    <div class="ml-1">{name}</div>
  {/if}
</div>

<style lang="scss">
  .item {
    align-items: center;
  }
</style>
