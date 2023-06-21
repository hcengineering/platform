<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  import { Card } from '@hcengineering/board'
  import { WithLookup } from '@hcengineering/core'
  import task, { calcRank, TodoItem } from '@hcengineering/task'
  import { translate } from '@hcengineering/platform'
  import presentation, { Card as Popup, createQuery, getClient } from '@hcengineering/presentation'
  import { Label, Dropdown, EditBox, themeStore } from '@hcengineering/ui'
  import type { ListItem } from '@hcengineering/ui'

  import board from '../../plugin'

  export let value: Card

  const noneListItem: ListItem = {
    _id: 'none',
    label: ''
  }

  let lastCardList: TodoItem | undefined = undefined
  let name: string | undefined
  let selectedTemplate: ListItem | undefined = undefined
  let templateListItems: ListItem[] = [noneListItem]
  let templatesMap: Map<string, TodoItem> = new Map()
  const client = getClient()
  const templatesQuery = createQuery()
  const dispatch = createEventDispatcher()

  translate(board.string.ChecklistDropdownNone, {}, $themeStore.language).then((result) => {
    noneListItem.label = result
  })

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
        assignee: null,
        rank: calcRank(lastCardList)
      }
    )
    if (items.length > 0) {
      await Promise.all(
        items.map((item) =>
          client.addCollection(task.class.TodoItem, value.space, checklistRef, task.class.TodoItem, 'items', {
            name: item.name,
            dueTo: item.dueTo,
            done: item.done,
            assignee: item.assignee,
            rank: item.rank
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
      lastCardList = undefined

      for (const card of result) {
        const todoItems = card.$lookup?.todoItems as TodoItem[]
        if (!todoItems) {
          continue
        }
        if (card._id === value?._id && todoItems.length > 0) {
          todoItems.sort((a, b) => a.rank?.localeCompare(b.rank))
          lastCardList = todoItems[todoItems.length - 1]
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

<Popup
  label={board.string.Checklists}
  okAction={addChecklist}
  okLabel={presentation.string.Add}
  canSave={(name?.length ?? 0) > 0}
  on:close={() => {
    dispatch('close')
  }}
>
  <div class="flex-col flex-gap-1">
    <Label label={board.string.Title} />
    <div class="p-2 mt-1 mb-1 border-divider-color border-radius-1">
      <EditBox bind:value={name} autoFocus />
    </div>
  </div>

  <div class="flex-col flex-gap-1">
    <Label label={board.string.CopyChecklistFrom} />
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
</Popup>
