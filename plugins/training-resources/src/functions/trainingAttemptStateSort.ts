//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { type TrainingAttemptState, trainingAttemptStateOrder } from '@hcengineering/training'
import { type TxOperations } from '@hcengineering/core'

export async function trainingAttemptStateSort (
  _: TxOperations,
  states: TrainingAttemptState[]
): Promise<TrainingAttemptState[]> {
  const result = [...states]
  result.sort((state1: TrainingAttemptState, state2: TrainingAttemptState) => trainingAttemptStateOrder.indexOf(state2) - trainingAttemptStateOrder.indexOf(state1))
  return result
}
