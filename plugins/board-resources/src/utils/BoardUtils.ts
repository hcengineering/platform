import { readable } from 'svelte/store'
import board, { Board, Card, CommonBoardPreference } from '@anticrm/board'
import core, { Ref, TxOperations } from '@anticrm/core'
import type { KanbanTemplate, TodoItem } from '@anticrm/task'
import preference from '@anticrm/preference'
import tags, { TagElement } from '@anticrm/tags'
import { createKanban } from '@anticrm/task'
import { createQuery, getClient } from '@anticrm/presentation'
import {
  FernColor,
  FlamingoColor,
  MalibuColor,
  MediumTurquoiseColor,
  MoodyBlueColor,
  SeaBuckthornColor,
  FeijoaColor,
  EastSideColor,
  SalmonColor,
  SeagullColor,
  areDatesEqual
} from '@anticrm/ui'

export async function createBoard (
  client: TxOperations,
  name: string,
  description: string,
  templateId?: Ref<KanbanTemplate>
): Promise<Ref<Board>> {
  const boardRef = await client.createDoc(board.class.Board, core.space.Space, {
    name,
    description,
    private: false,
    archived: false,
    members: []
  })

  await Promise.all([createKanban(client, boardRef, templateId)])
  return boardRef
}

export function getBoardAvailableColors (): string[] {
  return [
    FernColor,
    SeaBuckthornColor,
    FlamingoColor,
    MalibuColor,
    MoodyBlueColor,
    FeijoaColor,
    EastSideColor,
    MediumTurquoiseColor,
    SalmonColor,
    SeagullColor
  ]
}

export async function createCardLabel (
  client: TxOperations,
  { title, color }: { title: string, color: number }
): Promise<void> {
  await client.createDoc(tags.class.TagElement, tags.space.Tags, {
    title,
    color,
    targetClass: board.class.Card,
    description: '',
    category: board.category.Other
  })
}

export async function addCardLabel (client: TxOperations, card: Card, label: TagElement): Promise<void> {
  const { title, color, _id: tag } = label
  await client.addCollection(tags.class.TagReference, card.space, card._id, card._class, 'labels', {
    title,
    color,
    tag
  })
}

export function getDateIcon (item: TodoItem): 'normal' | 'warning' | 'overdue' {
  if (item.dueTo === null) return 'normal'
  const date = new Date()
  const dueDate = new Date(item.dueTo)
  return areDatesEqual(date, dueDate) ? 'warning' : dueDate < date ? 'overdue' : 'normal'
}

export const commonBoardPreference = readable<CommonBoardPreference>(undefined, (set) => {
  createQuery().query(board.class.CommonBoardPreference, { attachedTo: board.app.Board }, (result) => {
    if (result.total > 0) return set(result[0])
    void getClient().createDoc(board.class.CommonBoardPreference, preference.space.Preference, {
      attachedTo: board.app.Board,
      cardLabelsCompactMode: false
    })
  })
})
