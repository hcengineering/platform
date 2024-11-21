import type { Class, Doc, DocumentQuery, FindOptions, FindResult, Ref } from '@hcengineering/core'
import type { ResultArray } from './results'

export type Callback = (result: FindResult<Doc>) => void

export type QueryId = number
export interface Query {
  id: QueryId // uniq query identifier.
  _class: Ref<Class<Doc>>
  query: DocumentQuery<Doc>
  result: ResultArray | Promise<ResultArray>
  options?: FindOptions<Doc>
  total: number
  callbacks: Map<string, Callback>

  refresh: () => Promise<void>
}
