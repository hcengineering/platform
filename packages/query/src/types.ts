//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type ResponseEvent } from '@hcengineering/communication-sdk-types'
import { SortingOrder, type Window } from '@hcengineering/communication-types'

import { QueryResult } from './result'

export type QueryId = number

export const defaultQueryParams = {
  limit: 50,
  order: SortingOrder.Ascending
}

export enum Direction {
  Forward = 1,
  Backward = -1
}

export type FindParams = Partial<typeof defaultQueryParams>

export interface PagedQuery<R = any, P = FindParams> {
  readonly id: QueryId
  readonly params: P

  onEvent: (event: ResponseEvent) => Promise<void>

  requestLoadNextPage: () => Promise<void>
  requestLoadPrevPage: () => Promise<void>

  unsubscribe: () => Promise<void>

  setCallback: (callback: (window: Window<R>) => void) => void
  removeCallback: () => void
  copyResult: () => QueryResult<R> | undefined
}
