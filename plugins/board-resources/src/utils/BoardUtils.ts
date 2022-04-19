import core, { Ref, TxOperations } from '@anticrm/core'
import board, { Board, CardLabel } from '@anticrm/board'
import type { KanbanTemplate } from '@anticrm/task'
import { createKanban } from '@anticrm/task'
import {
  hexColorToNumber,
  FernColor,
  FlamingoColor,
  MalibuColor,
  MediumTurquoiseColor,
  MoodyBlueColor,
  SeaBuckthornColor,
  FeijoaColor,
  EastSideColor,
  SalmonColor,
  SeagullColor
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

  await Promise.all([createBoardLabels(client, boardRef), createKanban(client, boardRef, templateId)])
  return boardRef
}

export async function getBoardLabels (client: TxOperations, boardRef: Ref<Board>): Promise<CardLabel[]> {
  return await client.findAll(board.class.CardLabel, { attachedTo: boardRef })
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

export async function createBoardLabels (client: TxOperations, boardRef: Ref<Board>): Promise<void> {
  await Promise.all([
    createCardLabel(client, boardRef, hexColorToNumber(FernColor)),
    createCardLabel(client, boardRef, hexColorToNumber(SeaBuckthornColor)),
    createCardLabel(client, boardRef, hexColorToNumber(FlamingoColor)),
    createCardLabel(client, boardRef, hexColorToNumber(MalibuColor)),
    createCardLabel(client, boardRef, hexColorToNumber(MoodyBlueColor))
  ])
}

export async function createCardLabel (
  client: TxOperations,
  boardRef: Ref<Board>,
  color: number,
  title?: string,
  isHidden?: boolean
): Promise<void> {
  await client.createDoc(board.class.CardLabel, core.space.Model, {
    attachedTo: boardRef,
    attachedToClass: board.class.Board,
    collection: 'labels',
    color,
    title: title ?? '',
    isHidden: isHidden ?? false
  })
}
