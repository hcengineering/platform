import { TaskItem, TaskList } from '@tiptap/extension-list'

import { getDataAttribute } from './utils'

export const TodoItemNode = TaskItem.extend({
  name: 'todoItem',
  group: 'listItems',

  addOptions () {
    return {
      nested: true,
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
