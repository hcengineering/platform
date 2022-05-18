import board, { Board, CardLabel, Card } from '@anticrm/board'
import core, { Ref, TxOperations, Space } from '@anticrm/core'
import type { KanbanTemplate, TodoItem } from '@anticrm/task'
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

const isEqualLabel = (l1: CardLabel, l2: CardLabel): boolean =>
  l1.title === l2.title && l1.color === l2.color && (l1.isHidden ?? false) === (l2.isHidden ?? false)

export async function createMissingLabels (
  client: TxOperations,
  object: Card,
  targetBoard: Ref<Space>
): Promise<Array<Ref<CardLabel>> | undefined> {
  const sourceBoardLabels = await getBoardLabels(client, object.space)
  const targetBoardLabels = await getBoardLabels(client, targetBoard)

  const missingLabels = sourceBoardLabels.filter((srcLabel) => {
    if (!object.labels?.includes(srcLabel._id)) return false

    return targetBoardLabels.findIndex((targetLabel) => isEqualLabel(targetLabel, srcLabel)) === -1
  })

  await Promise.all(
    missingLabels.map(async (l) => await createCardLabel(client, targetBoard, l.color, l.title, l.isHidden))
  )

  const updatedTargetBoardLabels = await getBoardLabels(client, targetBoard)

  const labelsUpdate = object.labels
    ?.map((srcLabelId) => {
      const srcLabel = sourceBoardLabels.find((l) => l._id === srcLabelId)

      if (srcLabel === undefined) return null

      const targetLabel = updatedTargetBoardLabels.find((l) => isEqualLabel(l, srcLabel))

      if (targetLabel === undefined) return null

      return targetLabel._id
    })
    .filter((l) => l !== null) as Array<Ref<CardLabel>> | undefined

  return labelsUpdate
}

export function getDateIcon (item: TodoItem): 'normal' | 'warning' | 'overdue' {
  if (item.dueTo === null) return 'normal'
  const date = new Date()
  const dueDate = new Date(item.dueTo)
  return areDatesEqual(date, dueDate) ? 'warning' : dueDate < date ? 'overdue' : 'normal'
}
