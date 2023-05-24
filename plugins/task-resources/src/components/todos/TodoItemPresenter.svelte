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
  import type { TodoItem } from '@hcengineering/task'
  import { closeTooltip, Icon, showPopup } from '@hcengineering/ui'
  import task from '../../plugin'
  import EditTodo from './EditTodo.svelte'

  export let value: TodoItem
  export let inline: boolean = false

  function show (elm: EventTarget | null) {
    closeTooltip()
    showPopup(EditTodo, { item: value }, elm as HTMLElement)
  }
</script>

{#if value}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="flex-presenter" class:inline-presenter={inline} on:click={(ev) => show(ev.target)}>
    <div class="icon">
      <Icon icon={task.icon.Task} size={'small'} />
    </div>
    <span class="label">{value.name}</span>
  </div>
{/if}
