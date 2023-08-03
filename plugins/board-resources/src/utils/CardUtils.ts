import { Card } from '@hcengineering/board'
import { Employee, PersonAccount } from '@hcengineering/contact'
import {
  TxOperations as Client,
  TxResult,
  getCurrentAccount,
  Ref,
  Space,
  AttachedData,
  SortingOrder
} from '@hcengineering/core'
import { showPanel } from '@hcengineering/ui'
import task, { calcRank, State, TodoItem } from '@hcengineering/task'
import board from '../plugin'

export async function createCard (
  client: Client,
  space: Ref<Space>,
  status: Ref<State>,
  attribues: Partial<AttachedData<Card>>
): Promise<Ref<Card>> {
  const sequence = await client.findOne(task.class.Sequence, { attachedTo: board.class.Card })
  if (sequence === undefined) {
    throw new Error('sequence object not found')
  }

  const lastOne = await client.findOne(board.class.Card, {}, { sort: { rank: SortingOrder.Descending } })
  const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)

  const value: AttachedData<Card> = {
    title: '',
    status,
    doneState: null,
    startDate: null,
    dueDate: null,
    number: (incResult as any).object.sequence,
    rank: calcRank(lastOne, undefined),
    assignee: null,
    description: '',
    ...attribues
  }

  return await client.addCollection(board.class.Card, space, space, board.class.Board, 'cards', value)
}

export async function getCardFromTodoItem (client: Client, todoItem: TodoItem | undefined): Promise<Card | undefined> {
  if (todoItem === undefined) return
  if (todoItem.attachedToClass === todoItem._class) {
    return await getCardFromTodoItem(
      client,
      await client.findOne(todoItem._class, { _id: todoItem.attachedTo as Ref<TodoItem> })
    )
  }
  return await client.findOne(board.class.Card, { _id: todoItem.attachedTo as Ref<Card> })
}

export function updateCard (client: Client, card: Card, field: string, value: any): Promise<TxResult> | undefined {
  if (card === undefined) {
    return
  }
  return client.update(card, { [field]: value })
}

export function openCardPanel (card: Card): boolean {
  if (card === undefined) {
    return false
  }

  showPanel(board.component.EditCard, card._id, card._class, 'content')
  return true
}

export async function deleteCard (card: Card, client: Client): Promise<TxResult> {
  return await client.remove(card)
}

export function isArchived (card: Card): boolean {
  return card.isArchived !== undefined && card.isArchived
}

export function isUnarchived (card: Card): boolean {
  return card.isArchived === undefined || !card.isArchived
}

export function canAddCurrentUser (card: Card): boolean {
  if (card.members == null) {
    return true
  }
  const employee = (getCurrentAccount() as PersonAccount).person

  return !card.members.includes(employee as Ref<Employee>)
}

export function hasCover (card: Card): boolean {
  return card.cover != null
}

export function hasDate (card: Card): boolean {
  return card.dueDate !== undefined || card.startDate !== undefined
}

export function addCurrentUser (card: Card, client: Client): Promise<TxResult> | undefined {
  const employee = (getCurrentAccount() as PersonAccount).person

  if (card.members?.includes(employee as Ref<Employee>) === true) {
    return
  }

  return client.update(card, { $push: { members: employee as Ref<Employee> } })
}

export function archiveCard (card: Card, client: Client): Promise<TxResult> | undefined {
  return updateCard(client, card, 'isArchived', true)
}

export function unarchiveCard (card: Card, client: Client): Promise<TxResult> | undefined {
  return updateCard(client, card, 'isArchived', false)
}

export function updateCardMembers (card: Card, client: Client, users: Array<Ref<Employee>>): void {
  if (card?.members == null) return
  const { members } = card
  const membersToPull = members.filter((member) => !users.includes(member))
  const usersToPush = users.filter((member) => !members.includes(member))
  if (membersToPull.length > 0) void updateCard(client, card, '$pull', { members: { $in: membersToPull } })
  if (usersToPush.length > 0) void updateCard(client, card, '$push', { members: { $each: usersToPush, $position: 0 } })
}
