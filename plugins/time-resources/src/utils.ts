import type { WorkSlot, ToDo } from '@hcengineering/time'
import type { DefSeparators } from '@hcengineering/ui'
import core, { type Class, type Client, type Doc, type Ref } from '@hcengineering/core'
import time from '@hcengineering/time'
import { type TextEditorMode, type AnyExtension } from '@hcengineering/text-editor'
import { SvelteNodeViewRenderer } from '@hcengineering/text-editor-resources'
import { getClient } from '@hcengineering/presentation'

import ToDoItemNodeView from './components/text-editor/node-view/ToDoItemNodeView.svelte'
import ToDoListNodeView from './components/text-editor/node-view/ToDoListNodeView.svelte'
import { TodoItemExtension, TodoListExtension } from './text-editor-extensions'

export * from './types'

export function getNearest (events: WorkSlot[]): WorkSlot | undefined {
  const now = Date.now()
  events.sort((a, b) => a.date - b.date)
  return (
    events.find((event) => event.date <= now && event.dueDate >= now) ??
    events.find((event) => event.date >= now) ??
    events[events.length - 1]
  )
}

/**
 * @public
 */
export const timeSeparators: DefSeparators = [
  { minSize: 18, size: 18, maxSize: 22.5, float: 'navigator' },
  null,
  { minSize: 25, size: 41.25, maxSize: 90 }
]

/**
 * @public
 */
export const teamSeparators: DefSeparators = [{ minSize: 12.5, size: 17.5, maxSize: 22.5, float: 'navigator' }, null]

export async function ToDoTitleProvider (client: Client, ref: Ref<ToDo>, doc?: ToDo): Promise<string> {
  const object = doc ?? (await client.findOne(time.class.ToDo, { _id: ref }))

  if (object === undefined) return ''

  return object.title
}

function isTodoableClass (objectClass: Ref<Class<Doc>>): boolean {
  const hierarchy = getClient().getHierarchy()

  try {
    const todosCollection = hierarchy.getAttribute(objectClass, 'todos')

    return todosCollection !== undefined && todosCollection.type._class === core.class.Collection
  } catch (e) {
    return false
  }
}

function isTodoable (mode: TextEditorMode): boolean {
  return mode === 'full'
}

export function createTodoItemExtension (mode: TextEditorMode, ctx: any): AnyExtension | undefined {
  if (!isTodoable(mode)) {
    return
  }

  const { objectId, objectClass, objectSpace } = ctx
  const componentProps = isTodoableClass(objectClass) ? { objectId, objectClass, objectSpace } : {}

  return TodoItemExtension.extend({
    addNodeView () {
      return SvelteNodeViewRenderer(ToDoItemNodeView, {
        contentAs: 'li',
        contentClass: 'todo-item',
        componentProps
      })
    }
  }).configure({
    HTMLAttributes: {
      class: 'todo-item'
    }
  })
}

export function createTodoListExtension (mode: TextEditorMode, ctx: any): AnyExtension | undefined {
  if (!isTodoable(mode)) {
    return
  }

  return TodoListExtension.extend({
    addNodeView () {
      return SvelteNodeViewRenderer(ToDoListNodeView, {})
    }
  }).configure({
    HTMLAttributes: {
      class: 'todo-list'
    }
  })
}

export function calculateEventsDuration (events: WorkSlot[]): number {
  const points = events.flatMap((event) => [
    { time: event.date, type: 'start' },
    { time: event.dueDate, type: 'end' }
  ])

  points.sort((a, b) => a.time - b.time)

  let activeEvents = 0
  let duration = 0
  let lastTime = 0

  points.forEach((point) => {
    if (activeEvents > 0) {
      duration += point.time - lastTime
    }
    activeEvents += point.type === 'start' ? 1 : -1
    lastTime = point.time
  })

  return duration
}
