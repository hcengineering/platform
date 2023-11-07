import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'

import { getDataAttribute } from './utils'

export const TodoItemNode = TaskItem.extend({
  name: 'todoItem',

  addOptions () {
    return {
      nested: false,
      HTMLAttributes: {},
      taskListTypeName: 'todoList'
    }
  },

  addAttributes () {
    return {
      ...this.parent?.(),
      todoid: getDataAttribute('todoid', { default: null, keepOnSplit: false }),
      userid: getDataAttribute('userid', { default: null, keepOnSplit: false })
    }
  }
})

export const TodoListNode = TaskList.extend({
  name: 'todoList',

  addOptions () {
    return {
      itemTypeName: 'todoItem',
      HTMLAttributes: {}
    }
  }
})
