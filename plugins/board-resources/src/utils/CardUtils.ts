import { Card } from '@anticrm/board'
import { EmployeeAccount } from '@anticrm/contact'
import { TxOperations as Client, getCurrentAccount } from '@anticrm/core'

export function updateCard (client: Client, card: Card, field: string, value: any): void {
  if (!card) {
    return
  }
  client.update(card, { [field]: value })
}

export function deleteCard (card: Card, client: Client): void {
  client.remove(card)
}

export function isArchived (card: Card): boolean {
  return !!card.isArchived
}

export function isUnarchived (card: Card): boolean {
  return !card.isArchived
}

export function canAddCurrentUser (card: Card): boolean {
  if (card.members == null) {
    return true
  }
  const employee = (getCurrentAccount() as EmployeeAccount).employee

  return !card.members.includes(employee)
}

export function hasCover (card: Card): boolean {
  return !!card.coverColor || !!card.coverImage
}

export function hasDate (card: Card): boolean {
  return !!card.date && (!!card.date.dueDate || !!card.date.startDate)
}

export function addCurrentUser (card: Card, client: Client): void {
  const employee = (getCurrentAccount() as EmployeeAccount).employee

  if (card.members?.includes(employee)) {
    return
  }

  client.update(card, { $push: { members: employee } })
}

export function archiveCard (card: Card, client: Client): void {
  updateCard(client, card, 'isArchived', true)
}

export function unarchiveCard (card: Card, client: Client): void {
  updateCard(client, card, 'isArchived', false)
}
