//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import {
  type Training,
  type TrainingAttempt,
  TrainingAttemptState,
  type TrainingRequest,
  TrainingState
} from '@hcengineering/training'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'

export function canCreateTrainingAttempt (
  training: Training,
  request: TrainingRequest,
  latestOwnAttempt: TrainingAttempt | null
): boolean {
  const currentEmployeeRef = getCurrentEmployeeRef()
  return (
    training.state === TrainingState.Released &&
    request.canceledOn === null &&
    request.trainees.includes(currentEmployeeRef) &&
    (request.maxAttempts === null || latestOwnAttempt === null || latestOwnAttempt.seqNumber < request.maxAttempts) &&
    (latestOwnAttempt === null || latestOwnAttempt.state === TrainingAttemptState.Failed)
  )
}
