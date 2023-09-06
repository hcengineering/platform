import board, { Board, CommonBoardPreference } from '@hcengineering/board'
import core, { Ref, TxOperations, getCurrentAccount } from '@hcengineering/core'
import preference from '@hcengineering/preference'
import { createQuery, getClient } from '@hcengineering/presentation'
import type { KanbanTemplate, TodoItem } from '@hcengineering/task'
import { createStates } from '@hcengineering/task'
import {
  EastSideColor,
  FeijoaColor,
  FernColor,
  FlamingoColor,
  MalibuColor,
  MediumTurquoiseColor,
  MoodyBlueColor,
  SalmonColor,
  SeaBuckthornColor,
  SeagullColor,
  areDatesEqual
} from '@hcengineering/ui'
import { readable } from 'svelte/store'

export async function createBoard (
  client: TxOperations,
  name: string,
  description: string,
  templateId?: Ref<KanbanTemplate>
): Promise<Ref<Board>> {
  const [states, doneStates] = await createStates(client, board.attribute.State, board.attribute.DoneState, templateId)

  const boardRef = await client.createDoc(board.class.Board, core.space.Space, {
    name,
    description,
    private: false,
    archived: false,
    members: [getCurrentAccount()._id],
    templateId,
    states,
    doneStates
  })

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
