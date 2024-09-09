<script lang="ts">
  import { Person } from '@hcengineering/contact'
  import { AssigneePopup, EmployeePresenter } from '@hcengineering/contact-resources'
  import { type Class, type Doc, type Ref, type Space, SortingOrder } from '@hcengineering/core'
  import { MessageBox, createQuery, getClient } from '@hcengineering/presentation'
  import { makeRank } from '@hcengineering/rank'
  import { NodeViewContent, NodeViewProps, NodeViewWrapper } from '@hcengineering/text-editor-resources'
  import time, { ToDo, ToDoPriority } from '@hcengineering/time'
  import { CheckBox, getEventPositionElement, showPopup } from '@hcengineering/ui'

  import timeRes from '../../../plugin'

  export let node: NodeViewProps['node']
  export let editor: NodeViewProps['editor']
  export let updateAttributes: NodeViewProps['updateAttributes']

  export let objectId: Ref<Doc> | undefined = undefined
  export let objectClass: Ref<Class<Doc>> | undefined = undefined
  export let objectSpace: Ref<Space> | undefined = undefined

  const client = getClient()
  const query = createQuery()

  $: todoId = node.attrs.todoid as Ref<ToDo>
  $: userId = node.attrs.userid as Ref<Person>
  $: checked = node.attrs.checked ?? false
  $: readonly = !editor.isEditable || objectId === undefined

  let todo: ToDo | undefined = undefined
  $: query.query(
    time.class.ToDo,
    {
      _id: todoId
    },
    (res) => {
      ;[todo] = res
      void syncTodo(todo)
    }
  )

  async function syncTodo (todo: ToDo | undefined): Promise<void> {
    if (todo !== undefined) {
      const todoChecked = todo.doneOn != null
      if (todo._id !== todoId || todo.user !== userId || todoChecked !== checked) {
        updateAttributes({
          todoid: todo._id,
          userid: todo.user,
          checked: todoChecked
        })
      }
    } else {
      if (node.attrs.todoid != null) {
        updateAttributes({
          todoid: null,
          userid: null
        })
      }
    }
  }

  async function markDone (): Promise<void> {
    if (todo !== undefined) {
      await client.update(todo, { doneOn: todo.doneOn == null ? Date.now() : null })
    } else {
      updateAttributes({ checked: node.attrs.checked !== true })
    }
  }

  async function assignTodo (user: Ref<Person>): Promise<void> {
    if (todo !== undefined && todo.user === user) return
    if (objectId === undefined || objectClass === undefined || objectSpace === undefined) return

    const title = node.textBetween(0, node.content.size, undefined, ' ')

    const ops = client.apply(undefined, 'assign-todo')

    if (todo !== undefined) {
      await ops.remove(todo)
    }

    const doneOn = node.attrs.checked === true ? Date.now() : null

    const latestTodoItem = await ops.findOne(
      time.class.ToDo,
      {
        user,
        doneOn: doneOn === null ? null : { $ne: null }
      },
      {
        sort: { rank: SortingOrder.Ascending }
      }
    )
    const rank = makeRank(undefined, latestTodoItem?.rank)

    const id = await ops.addCollection(time.class.ProjectToDo, time.space.ToDos, objectId, objectClass, 'todos', {
      attachedSpace: objectSpace,
      title,
      description: '',
      user,
      workslots: 0,
      priority: ToDoPriority.NoPriority,
      visibility: 'public',
      doneOn,
      rank
    })

    await ops.commit()

    updateAttributes({
      todoid: id,
      userid: user
    })
  }

  async function unassignTodo (): Promise<void> {
    updateAttributes({
      todoid: null,
      userid: null
    })

    if (todo !== undefined) {
      await client.remove(todo)
    }
  }

  async function assignTodoConfirm (user: Ref<Person>): Promise<void> {
    showPopup(
      MessageBox,
      {
        label: timeRes.string.ReassignToDo,
        message: timeRes.string.ReassignToDoConfirm,
        action: async () => {
          await assignTodo(user)
        }
      },
      'top'
    )
  }

  async function unassignTodoConfirm (): Promise<void> {
    showPopup(
      MessageBox,
      {
        label: timeRes.string.UnassignToDo,
        message: timeRes.string.UnassignToDoConfirm,
        action: async () => {
          await unassignTodo()
        }
      },
      'top'
    )
  }

  async function changeAssignee (user: Ref<Person> | undefined): Promise<void> {
    const shouldConfirm = todo !== undefined && todo?.workslots > 0
    if (user !== undefined) {
      shouldConfirm ? await assignTodoConfirm(user) : await assignTodo(user)
    } else {
      shouldConfirm ? await unassignTodoConfirm() : await unassignTodo()
    }
  }

  let hovered = false

  function handleAssigneeEdit (ev: MouseEvent): void {
    ev.preventDefault()
    ev.stopPropagation()

    hovered = true
    showPopup(
      AssigneePopup,
      {
        selected: userId
      },
      getEventPositionElement(ev),
      async (result) => {
        if (result !== undefined && result?._id !== userId) {
          await changeAssignee(result?._id)
        }
        hovered = false
        editor.commands.focus()
      }
    )
  }
</script>

<NodeViewWrapper data-drag-handle="" data-type="todoItem">
  <div
    class="todo-item flex-row-top flex-gap-3"
    class:empty={node.textContent.length === 0}
    class:unassigned={userId == null}
    class:hovered
  >
    <div class="flex-center assignee" contenteditable="false">
      <EmployeePresenter
        value={userId}
        disabled={readonly}
        avatarSize={'card'}
        shouldShowName={false}
        shouldShowPlaceholder
        onEmployeeEdit={handleAssigneeEdit}
      />
    </div>

    <div class="flex-center todo-check" contenteditable="false">
      <CheckBox {readonly} {checked} on:value={markDone} kind={'positive'} size={'medium'} />
    </div>

    <NodeViewContent style="outline: none;" class="flex-grow" />
  </div>
</NodeViewWrapper>

<style lang="scss">
  .todo-item {
    .assignee {
      width: 1.25rem;
      cursor: pointer;
    }
    .assignee,
    .todo-check {
      height: 1.5em;
    }

    &.unassigned {
      .assignee {
        opacity: 0;
      }
    }

    &.empty {
      .assignee {
        visibility: hidden;
      }
    }

    &.hovered,
    &:hover,
    &:focus-within {
      .assignee {
        opacity: 1;
      }
    }
  }
</style>
