<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Ref } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import type { TodoItem } from '@anticrm/task'
  import task from '@anticrm/task'
  import { Button, CheckBox, EditBox, Icon, Progress } from '@anticrm/ui'
  import { HTMLPresenter } from '@anticrm/view-resources'

  import board from '../../plugin'

  export let value: TodoItem
  const client = getClient()
  let checklistItems: TodoItem[] = []
  let done = 0
  let isAdding: boolean = false
  let hovered: Ref<TodoItem> | undefined

  async function fetch() {
    checklistItems = await client.findAll(task.class.TodoItem, { space: value.space, attachedTo: value._id })
    done = checklistItems.reduce((result: number, current: TodoItem) => {
      return current.done ? result + 1 : result
    }, 0)
  }

  async function deleteChecklist () {
    if (!value) {
      return
    }
    client.removeCollection(
      value._class,
      value.space,
      value._id,
      value.attachedTo,
      value.attachedToClass,
      value.collection
    )
  }

  async function addChecklistItem (event: CustomEvent<string>) {
    isAdding = false
    const name = event.detail
    if (!name || !value) {
      return
    }
    await client.addCollection(task.class.TodoItem, value.space, value._id, value._class, 'items', {
      name,
      dueTo: null,
      assignee: null,
      done: false
    })
    fetch()
  }

  async function setDoneToChecklistItem (item: TodoItem, event: CustomEvent<boolean>) {
    const isDone = event.detail
    if (!value) {
      return
    }
    await client.update(item, { done: isDone })
    fetch()
  }

  $: value?.items && value.items > 0 && fetch()

</script>

{#if value !== undefined}
  <div class="flex-col w-full">
    <div class="flex-row-stretch mt-4 mb-2">
      <div class="w-9">
        <Icon icon={board.icon.Card} size="large" />
      </div>
      <div class="flex-grow fs-title">{value.name}</div>
      <Button label={board.string.Delete} kind="no-border" size="small" on:click={deleteChecklist} />
    </div>
    <div class="flex-row-stretch mb-2 mt-1">
      <Progress min={0} max={checklistItems.length} value={done} />
    </div>
    {#each checklistItems as item}
      <div class="flex-row-stretch mb-1 mt-1 pl-1"
      class:background-button-noborder-bg-hover={hovered === item._id}
      on:mouseover={() => {
        hovered = item._id
      }}
      on:focus={() => {
        hovered = item._id
      }}
      on:mouseout={() => {
        hovered = undefined
      }}
      on:blur={() => {
        hovered = undefined
      }}
      >
        <div class="w-9 flex items-center">
          <CheckBox bind:checked={item.done} on:value={(event) => setDoneToChecklistItem(item, event)} />
        </div>
        <div class="flex-col flex-gap-1 w-full">
          <HTMLPresenter bind:value={item.name} />
        </div>
      </div>
    {/each}
    <div class="flex-row-stretch mt-4 mb-2">
      <div class="w-9" />
      {#if isAdding}
        <div class="border-bg-accent border-radius-3 w-full h-8 p-1">
          <EditBox on:change={addChecklistItem} />
        </div>
      {:else}
        <Button
          label={board.string.AddCard}
          kind="no-border"
          size="small"
          on:click={() => {
            isAdding = true
          }} />
      {/if}
    </div>
  </div>
{/if}
