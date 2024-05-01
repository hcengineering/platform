import { type Card } from '@hcengineering/board'
import { type Employee } from '@hcengineering/contact'
import {
  type TxOperations as Client,
  type TxResult,
  type Ref,
} from '@hcengineering/core'
import { showPanel } from '@hcengineering/ui'
import board from '../plugin'
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
export function isArchived (card: Card): boolean {
  return card.isArchived !== undefined && card.isArchived
}
export function hasDate (card: Card): boolean {
  return card.dueDate !== undefined || card.startDate !== undefined
}
export function updateCardMembers (card: Card, client: Client, users: Array<Ref<Employee>>): void {
  if (card?.members == null) return
  const { members } = card
  const membersToPull = members.filter((member) => !users.includes(member))
  const usersToPush = users.filter((member) => !members.includes(member))
  if (membersToPull.length > 0) void updateCard(client, card, '$pull', { members: { $in: membersToPull } })
  if (usersToPush.length > 0) void updateCard(client, card, '$push', { members: { $each: usersToPush, $position: 0 } })
}
