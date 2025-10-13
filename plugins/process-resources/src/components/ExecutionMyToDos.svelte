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
  import { createQuery } from '@hcengineering/presentation'
  import plugin from '../plugin'
  import { Execution, ProcessToDo } from '@hcengineering/process'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { Component } from '@hcengineering/ui'
  import time from '@hcengineering/time'

  export let value: Execution

  let todos: ProcessToDo[] = []

  const emp = getCurrentEmployee()

  const query = createQuery()
  query.query(
    plugin.class.ProcessToDo,
    {
      execution: value._id,
      user: emp,
      doneOn: null
    },
    (res) => {
      todos = res
    }
  )
</script>

{#each todos as todo (todo._id)}
  <Component is={time.component.ToDoPresenter} props={{ value: todo, withouthWorkItem: true, showCheck: true }} />
{/each}
