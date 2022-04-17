import { Ref, TxOperations } from '@anticrm/core'
import board, { Board, CardLabel } from '@anticrm/board'
import core from '@anticrm/model-core'
import type { KanbanTemplate } from '@anticrm/task'
import { createKanban } from '@anticrm/task'
import { hexColorToNumber, FernColor, FlamingoColor, MalibuColor, MoodyBlueColor, SeaBuckthornColor } from '@anticrm/ui'

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

  await Promise.all([createBoardLabels(client, boardRef), createKanban(client, boardRef, templateId)])
  return boardRef
}

export async function getBoardLabels (client: TxOperations, boardRef: Ref<Board>): Promise<CardLabel[]> {
  return await client.findAll(board.class.CardLabel, { attachedTo: boardRef })
}

export async function createBoardLabels (client: TxOperations, boardRef: Ref<Board>): Promise<void> {
  await Promise.all([
    createCardLabel(client, boardRef, FernColor),
    createCardLabel(client, boardRef, SeaBuckthornColor),
    createCardLabel(client, boardRef, FlamingoColor),
    createCardLabel(client, boardRef, MalibuColor),
    createCardLabel(client, boardRef, MoodyBlueColor)
  ])
}

export async function createCardLabel (client: TxOperations, boardRef: Ref<Board>, color: string, title?: string): Promise<void> {
  await client.createDoc(board.class.CardLabel, core.space.Model, {
    attachedTo: boardRef,
    attachedToClass: board.class.Board,
    collection: '',
    color: hexColorToNumber(color),
    title: title ?? ''
  })
}
