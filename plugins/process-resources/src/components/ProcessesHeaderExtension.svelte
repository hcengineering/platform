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
  import { Card } from '@hcengineering/card'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { ApproveRequest, EventButton, Execution, ExecutionStatus, ProcessToDo } from '@hcengineering/process'
  import { Button } from '@hcengineering/ui'
  import process from '../plugin'
  import ApproveRequestButtons from './ApproveRequestButtons.svelte'

  export let card: Card

  let docs: Execution[] = []
  let todos: ProcessToDo[] = []
  let actions: EventButton[] = []

  const buttonsQuery = createQuery()
  $: buttonsQuery.query(
    process.class.EventButton,
    {
      card: card._id
    },
    (res) => {
      actions = res
    }
  )

  const executionQuery = createQuery()
  $: executionQuery.query(
    process.class.Execution,
    {
      card: card._id,
      status: { $ne: ExecutionStatus.Cancelled }
    },
    (res) => {
      docs = res
    }
  )

  const emp = getCurrentEmployee()

  const query = createQuery()
  $: query.query(
    process.class.ProcessToDo,
    {
      execution: { $in: docs.map((d) => d._id) },
      user: emp,
      doneOn: null
    },
    (res) => {
      todos = res
    }
  )

  const client = getClient()

  async function checkTodo (todo: ProcessToDo) {
    await client.update(todo, {
      doneOn: new Date().getTime()
    })
  }

  async function performAction (action: EventButton) {
    await client.createDoc(process.class.ProcessCustomEvent, action.space, {
      execution: action.execution,
      eventType: action.eventType,
      card: card._id
    })
  }

  async function performRollback (execution: Execution) {
    await client.createDoc(process.class.ProcessCustomEvent, execution.space, {
      execution: execution._id,
      eventType: 'rollback',
      card: card._id
    })
  }

  function getExecutionLabel (execution: Execution): string {
    const pr = client.getModel().findObject(execution.process)
    if (pr !== undefined) {
      return `${pr.name}: `
    }
    return ''
  }

  $: rollbacks = docs.filter((d) => d.rollback.length > 0)

  function isRequest (todo: ProcessToDo): todo is ApproveRequest {
    return todo._class === process.class.ApproveRequest
  }
</script>

{#each todos as todo (todo._id)}
  {#if isRequest(todo)}
    <ApproveRequestButtons {todo} card={card._id} />
  {:else}
    <Button kind={'primary'} label={getEmbeddedLabel(todo.title)} on:click={() => checkTodo(todo)} />
  {/if}
{/each}
{#each actions as action (action._id)}
  <Button kind={'primary'} label={getEmbeddedLabel(action.title)} on:click={() => performAction(action)} />
{/each}
{#each rollbacks as rollback}
  {getExecutionLabel(rollback)}
  <Button kind={'dangerous'} label={process.string.Rollback} on:click={() => performRollback(rollback)} />
{/each}
