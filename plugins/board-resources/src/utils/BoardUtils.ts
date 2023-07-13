import { readable } from 'svelte/store'
import board, { Board, CommonBoardPreference } from '@hcengineering/board'
import core, { getCurrentAccount, Ref, TxOperations } from '@hcengineering/core'
import type { KanbanTemplate, TodoItem } from '@hcengineering/task'
import preference from '@hcengineering/preference'
import { createKanban } from '@hcengineering/task'
import { createQuery, getClient } from '@hcengineering/presentation'
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
} from '@hcengineering/ui'

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
    members: [getCurrentAccount()._id],
    templateId
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

export function getDateIcon (item: TodoItem): 'normal' | 'warning' | 'overdue' {
  if (item.dueTo === null) return 'normal'
  const date = new Date()
  const dueDate = new Date(item.dueTo)
  return areDatesEqual(date, dueDate) ? 'warning' : dueDate < date ? 'overdue' : 'normal'
}

export const commonBoardPreference = readable<CommonBoardPreference>(undefined, (set) => {
  createQuery().query(board.class.CommonBoardPreference, { attachedTo: board.app.Board }, (result) => {
    if (result.length > 0) return set(result[0])
    void getClient().createDoc(board.class.CommonBoardPreference, preference.space.Preference, {
      attachedTo: board.app.Board
    })
  })
})
