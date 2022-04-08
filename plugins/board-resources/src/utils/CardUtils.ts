import { Card } from '@anticrm/board'
import { EmployeeAccount } from '@anticrm/contact'
import { TxOperations as Client, getCurrentAccount } from '@anticrm/core'

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

export function updateCard (client: Client, card: Card, field: string, value: any): void {
  if (!card) {
    return
  }
  client.update(card, { [field]: value })
}

export function addCurrentUser (card: Card, client: Client): void {
  const employee = (getCurrentAccount() as EmployeeAccount).employee
  card.members = card.members ?? []

  if (card.members.includes(employee)) {
    return
  }

  card.members.push(employee)
  updateCard(client, card, 'members', card.members)
}
