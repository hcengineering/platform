import { Doc } from '@anticrm/core'
import { Asset } from '@anticrm/platform'

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
  color?: string
  icon?: Asset
}
/**
 * @public
 */
export type Item = DocWithRank & { state: StateType, doneState: StateType | null }
/**
 * @public
 */
export interface ExtItem {
  prev?: Item
  it: Item
  next?: Item
  pos: number
}
/**
 * @public
 */
export type CardDragEvent = DragEvent & { currentTarget: EventTarget & HTMLDivElement }
