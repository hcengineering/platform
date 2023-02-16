import { Doc } from '@hcengineering/core'
import { Asset } from '@hcengineering/platform'

/**
 * @public
 */
export interface DocWithRank extends Doc {
  rank: string
}

export type StateType = any

/**
 * @public
 */
export interface TypeState {
  _id: StateType
  title: string
  color: number
  icon?: Asset
}
/**
 * @public
 */
export type Item = DocWithRank & { state: StateType, doneState: StateType | null }

/**
 * @public
 */
export type CardDragEvent = DragEvent & { currentTarget: EventTarget & HTMLDivElement }
