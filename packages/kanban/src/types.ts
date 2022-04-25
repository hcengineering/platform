import { Doc } from '@anticrm/core'

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
}
