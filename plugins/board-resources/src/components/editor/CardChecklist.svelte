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
  import { Employee } from '@hcengineering/contact'
  import { EmployeeBox } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { MessageBox, createQuery, getClient } from '@hcengineering/presentation'
  import type { TodoItem } from '@hcengineering/task'
  import task, { calcRank } from '@hcengineering/task'
  import {
    Button,
    CheckBox,
    DateRangePresenter,
    IconAdd,
    IconDelete,
    IconMoreH,
    Progress,
    TextAreaEditor,
    getEventPopupPositionElement,
    showPopup
  } from '@hcengineering/ui'
  import { ContextMenu, HTMLPresenter } from '@hcengineering/view-resources'

  import board from '../../plugin'
  import { getDateIcon } from '../../utils/BoardUtils'

  export let value: TodoItem
  const client = getClient()
  const checklistItemsQuery = createQuery()
  let checklistItems: TodoItem[] = []
  let done = 0
  let isEditingName: boolean = false
  let isAddingItem: boolean = false
  let hideDoneItems: boolean = false
  let newItemName = ''
  let editingItemId: Ref<TodoItem> | undefined = undefined
  let hovered: Ref<TodoItem> | undefined = undefined
  let dragItem: TodoItem | undefined = undefined
  let dragOverItem: TodoItem | undefined = undefined

  function deleteChecklist () {
    if (!value) {
      return
    }
    showPopup(
      MessageBox,
      {
        label: board.string.DeleteChecklist,
        message: board.string.DeleteChecklistConfirm
      },
      undefined,
      (result?: boolean) => {
        if (result === true) {
          client.removeCollection(
            value._class,
            value.space,
            value._id,
            value.attachedTo,
            value.attachedToClass,
            value.collection
          )
        }
      }
    )
  }

  function startAddingItem () {
    isAddingItem = true
  }

  async function addItem (event: CustomEvent<string>) {
    newItemName = ''
    const prev = checklistItems && checklistItems.length > 0 ? checklistItems[checklistItems.length - 1] : undefined
    const item = {
      name: event.detail ?? '',
      assignee: null,
      dueTo: null,
      done: false,
      rank: calcRank(prev, undefined)
    }
    if (item.name.length <= 0) {
      return
    }
    await client.addCollection(task.class.TodoItem, value.space, value._id, value._class, 'items', item)
  }

  function updateItemName (item: TodoItem, name: string) {
    if (name === undefined || name.length === 0 || name === item.name) return
    client.update(item, { name })
  }

  function updateName (event: CustomEvent<string>) {
    isEditingName = false
    updateItemName(value, event.detail)
  }

  function updateItemAssignee (item: TodoItem, assignee: Ref<Employee>) {
    client.update(item, { assignee })
  }

  function updateDueDate (item: TodoItem, dueTo: number) {
    client.update(item, { dueTo })
  }

  async function setDoneToChecklistItem (item: TodoItem, event: CustomEvent<boolean>) {
    const isDone = event.detail
    if (!value) {
      return
    }
    await client.update(item, { done: isDone })
  }

  function showItemMenu (item: TodoItem, e?: Event) {
    showPopup(ContextMenu, { object: item }, getEventPopupPositionElement(e))
  }

  function itemDrop (): void {
    if (dragItem === undefined || dragOverItem === undefined || dragItem._id === dragOverItem._id) {
      return
    }
    const index = checklistItems.findIndex((item) => item._id === dragOverItem?._id)
    const dragIndex = checklistItems.findIndex((item) => item._id === dragItem?._id)
    if (dragIndex > index) {
      const prev = index - 1 >= 0 ? checklistItems[index - 1] : undefined
      dragItem.rank = calcRank(prev, dragOverItem)
      client.update(dragItem, { rank: dragItem.rank })
    } else {
      const next = index + 1 < checklistItems.length ? checklistItems[index + 1] : undefined
      dragItem.rank = calcRank(dragOverItem, next)
      client.update(dragItem, { rank: dragItem.rank })
    }
  }

  $: checklistItemsQuery.query(
    task.class.TodoItem,
    { space: value.space, attachedTo: value._id },
    (result) => {
      checklistItems = result
      done = checklistItems.reduce((result: number, current: TodoItem) => {
        return current.done ? result + 1 : result
      }, 0)
    },
    {
      sort: {
        rank: 1
      }
    }
  )
</script>

{#if value !== undefined}
  <div
    class="flex-col w-full"
    on:drop|preventDefault={(ev) => {
      itemDrop()
    }}
    on:dragover|preventDefault
    on:dragleave
  >
    <div class="flex-row-stretch mt-4 mb-2">
      {#if isEditingName}
        <div class="flex-grow">
          <TextAreaEditor
            value={value.name}
            on:submit={updateName}
            on:cancel={() => {
              isEditingName = false
            }}
          />
        </div>
      {:else}
        <div
          class="flex-grow fs-title"
          on:click={() => {
            isEditingName = true
          }}
        >
          {value.name}
        </div>
        {#if done > 0}
          <Button
            label={hideDoneItems ? board.string.ShowDoneChecklistItems : board.string.HideDoneChecklistItems}
            labelParams={{ done }}
            kind="ghost"
            size="small"
            on:click={() => {
              hideDoneItems = !hideDoneItems
            }}
          />
        {/if}
        <Button icon={IconAdd} kind="ghost" size="small" on:click={startAddingItem} />
        <Button icon={IconDelete} kind="ghost" size="small" on:click={deleteChecklist} />
      {/if}
    </div>
    <div class="flex-row-stretch mb-2 mt-1">
      <div class="w-9 text-sm pl-1 pr-1">
        {checklistItems.length > 0 ? Math.round((done / checklistItems.length) * 100) : 0}%
      </div>
      <div class="flex-center flex-grow w-full">
        <Progress min={0} max={checklistItems?.length ?? 0} value={done} />
      </div>
    </div>
    {#each checklistItems.filter((item) => !hideDoneItems || !item.done) as item}
      <div
        class="flex-row-stretch mb-1 mt-1 pl-1 min-h-7 border-radius-1"
        class:background-button-noborder-bg-hover={hovered === item._id && editingItemId !== item._id}
        draggable={true}
        on:dragstart={() => {
          dragItem = item
        }}
        on:dragend={() => {
          dragItem = undefined
          dragOverItem = undefined
        }}
        on:dragover={() => {
          dragOverItem = item
        }}
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
        {#if editingItemId === item._id}
          <div class="flex-grow">
            <TextAreaEditor
              value={item.name}
              on:submit={(event) => {
                editingItemId = undefined
                updateItemName(item, event.detail)
              }}
              on:cancel={() => {
                editingItemId = undefined
              }}
            />
          </div>
        {:else}
          <div
            class="flex-col justify-center flex-gap-1 w-full"
            class:text-line-through={item.done}
            on:click={() => {
              editingItemId = item._id
            }}
          >
            <HTMLPresenter bind:value={item.name} />
          </div>
          <div class="flex-center gap-1">
            <DateRangePresenter
              editable
              bind:value={item.dueTo}
              icon={getDateIcon(item)}
              on:change={(e) => updateDueDate(item, e.detail)}
              noShift
            />
            <EmployeeBox
              label={board.string.Assignee}
              bind:value={item.assignee}
              allowDeselect={true}
              on:change={(e) => {
                updateItemAssignee(item, e.detail)
              }}
            />
            <Button icon={IconMoreH} kind="ghost" size="small" on:click={(e) => showItemMenu(item, e)} />
          </div>
        {/if}
      </div>
    {/each}
    <div class="flex-row-stretch mt-2 mb-2">
      <div class="w-9" />
      {#if isAddingItem}
        <div class="w-full p-1">
          <TextAreaEditor
            bind:value={newItemName}
            on:submit={addItem}
            on:cancel={() => {
              newItemName = ''
              isAddingItem = false
            }}
          />
        </div>
      {/if}
    </div>
  </div>
{/if}
