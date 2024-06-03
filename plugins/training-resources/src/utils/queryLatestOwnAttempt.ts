//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { TrainingAttempt, TrainingRequest } from '@hcengineering/training'
import { SortingOrder } from '@hcengineering/core'
import { type LiveQuery } from '@hcengineering/presentation'
import training from '../plugin'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'

export function queryLatestOwnAttempt (
  query: LiveQuery,
  request: TrainingRequest,
  callback: (result: TrainingAttempt | undefined) => void | Promise<void>
): boolean {
  return query.query(
    training.class.TrainingAttempt,
    {
      attachedTo: request._id,
      attachedToClass: request._class,
      space: request.space,
      owner: getCurrentEmployeeRef()
    },
    async (result) => {
      await callback(result[0])
    },
    {
      sort: {
        seqNumber: SortingOrder.Descending,
        createdOn: SortingOrder.Descending
      },
      limit: 1
    }
  )
}
