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
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { ApproveRequest, Execution, ExecutionStatus, ProcessToDo } from '@hcengineering/process'
  import { Button } from '@hcengineering/ui'
  import plugin from '../plugin'
  import ApproveRequestButtons from './ApproveRequestButtons.svelte'

  export let value: Execution

  let todos: ProcessToDo[] = []

  const client = getClient()

  const emp = getCurrentEmployee()

  const query = createQuery()
  $: if (value.status === ExecutionStatus.Active) {
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
  } else {
    query.unsubscribe()
    todos = []
  }

  async function checkTodo (todo: ProcessToDo) {
    await client.update(todo, {
      doneOn: new Date().getTime()
    })
  }

  function isRequest (todo: ProcessToDo): todo is ApproveRequest {
    return todo._class === plugin.class.ApproveRequest
  }
</script>

{#each todos as todo (todo._id)}
  {#if isRequest(todo)}
    <ApproveRequestButtons {todo} card={value.card} />
  {:else}
    <Button label={getEmbeddedLabel(todo.title)} on:click={() => checkTodo(todo)} />
  {/if}
{/each}
