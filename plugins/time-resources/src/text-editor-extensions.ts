import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'

import { getDataAttribute } from '@hcengineering/text-editor-resources'

export const TodoItemExtension = TaskItem.extend({
  name: 'todoItem',

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

export const TodoListExtension = TaskList.extend({
  name: 'todoList',

  addOptions () {
    return {
      itemTypeName: 'todoItem',
      HTMLAttributes: {}
    }
  }
})
