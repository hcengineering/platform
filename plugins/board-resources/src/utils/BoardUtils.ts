import board, { type Board, type CommonBoardPreference } from '@hcengineering/board'
import core, { getCurrentAccount, type Ref, type TxOperations } from '@hcengineering/core'
import preference from '@hcengineering/preference'
import { createQuery, getClient } from '@hcengineering/presentation'
import type { ProjectType } from '@hcengineering/task'
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
  SeagullColor
} from '@hcengineering/ui'
import { readable } from 'svelte/store'

export async function createBoard (
  client: TxOperations,
  name: string,
  description: string,
  type: Ref<ProjectType>
): Promise<Ref<Board>> {
  const boardRef = await client.createDoc(board.class.Board, core.space.Space, {
    name,
    description,
    private: false,
    archived: false,
    members: [getCurrentAccount()._id],
    type
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
export const commonBoardPreference = readable<CommonBoardPreference>(undefined, (set) => {
  createQuery().query(board.class.CommonBoardPreference, { attachedTo: board.app.Board }, (result) => {
    if (result.length > 0) {
      set(result[0])
      return
    }
    void getClient().createDoc(board.class.CommonBoardPreference, preference.space.Preference, {
      attachedTo: board.app.Board
    })
  })
})
