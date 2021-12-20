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
  import type { TodoItem } from '@anticrm/task'
  import { closeTooltip, Icon, showPopup } from '@anticrm/ui'
  import task from '../../plugin'
  import EditTodo from './EditTodo.svelte'

  export let value: TodoItem


  function show (elm: EventTarget | null) {
    closeTooltip()
    showPopup(EditTodo, { item: value }, elm as HTMLElement)
  }
</script>

<div class="sm-tool-icon" on:click={(evt) => show(evt.target)}>
  <span class="icon"><Icon icon={task.icon.Task} size={'small'} /></span>{value.name}
</div>
