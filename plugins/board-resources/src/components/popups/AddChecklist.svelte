<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  import { Card } from '@anticrm/board'
  import { WithLookup } from '@anticrm/core'
  import task, { TodoItem } from '@anticrm/task'
  import { translate } from '@anticrm/platform'
  import presentation, { createQuery, getClient } from '@anticrm/presentation'
  import { Label, Button, Dropdown, EditBox, IconClose } from '@anticrm/ui'
  import type { ListItem } from '@anticrm/ui'

  import board from '../../plugin'

  export let value: Card

  const noneListItem: ListItem = {
    _id: 'none',
    label: ''
  }

  let name: string | undefined
  let selectedTemplate: ListItem | undefined = undefined
  let templateListItems: ListItem[] = [noneListItem]
  let templatesMap: Map<string, TodoItem> = new Map()
  const client = getClient()
  const templatesQuery = createQuery()
  const dispatch = createEventDispatcher()

  translate(board.string.ChecklistDropdownNone, {}).then((result) => {
    noneListItem.label = result
  })

  function close () {
    dispatch('close')
  }

  async function addChecklist () {
    if (!name || name.trim().length <= 0) {
      return
    }

    const template = selectedTemplate ? templatesMap.get(selectedTemplate._id) : undefined
    const items: TodoItem[] = template ? await client.findAll(task.class.TodoItem, { attachedTo: template._id }) : []
    const checklistRef = await client.addCollection(
      task.class.TodoItem,
      value.space,
      value._id,
      value._class,
      'todoItems',
      {
        name,
        done: false,
        dueTo: null,
        assignee: null
      }
    )
    if (items.length > 0) {
      await Promise.all(
        items.map((item) =>
          client.addCollection(task.class.TodoItem, value.space, checklistRef, task.class.TodoItem, 'items', {
            name: item.name,
            dueTo: item.dueTo,
            done: item.done,
            assignee: item.assignee
          })
        )
      )
    }
    dispatch('close')
  }

  $: templatesQuery.query(
    board.class.Card,
    { todoItems: { $gt: 0 } },
    (result: WithLookup<Card>[]) => {
      templateListItems = [noneListItem]
      templatesMap = new Map()

      for (const card of result) {
        const todoItems = card.$lookup?.todoItems as TodoItem[]
        if (!todoItems) {
          continue
        }

        templateListItems.push({
          _id: card._id,
          label: card.title,
          fontWeight: 'semi-bold',
          isSelectable: false
        })

        for (const todoItem of todoItems) {
          templateListItems.push({
            _id: todoItem._id,
            label: todoItem.name,
            paddingLeft: 4
          })
          templatesMap.set(todoItem._id, todoItem)
        }
      }
    },
    { lookup: { _id: { todoItems: task.class.TodoItem } } }
  )
</script>

<div class="antiPopup w-85">
  <div class="relative flex-row-center w-full ">
    <div class="flex-center flex-grow fs-title mt-1 mb-1">
      <Label label={board.string.Checklists} />
    </div>

    <div class="absolute mr-1 mt-1 mb-1" style:top="0" style:right="0">
      <Button icon={IconClose} kind="transparent" size="small" on:click={close} />
    </div>
  </div>
  <div class="ap-space bottom-divider" />
  <div class="flex-col ml-4 mt-4 mr-4 flex-gap-1">
    <div class="text-md font-medium">
      <Label label={board.string.Title} />
    </div>

    <div class="p-2 mt-1 mb-1 border-bg-accent border-radius-1">
      <EditBox bind:value={name} maxWidth="100%" focus={true} />
    </div>
  </div>

  <div class="flex-col ml-4 mt-4 mr-4 flex-gap-1">
    <div class="text-md font-medium">
      <Label label={board.string.CopyChecklistFrom} />
    </div>

    <div class="mt-1 mb-1 w-full">
      <Dropdown
        bind:selected={selectedTemplate}
        items={templateListItems}
        justify="left"
        width="100%"
        placeholder={board.string.ChecklistDropdownNone}
      />
    </div>
  </div>

  <div class="ap-footer">
    <Button
      label={presentation.string.Add}
      size="small"
      kind="primary"
      disabled={(name?.length ?? 0) <= 0}
      on:click={addChecklist}
    />
  </div>
</div>
