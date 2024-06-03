//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { TrainingRequest } from '@hcengineering/training'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'

export function canCancelTrainingRequest (object: TrainingRequest): boolean {
  return object.canceledOn === null && object.owner === getCurrentEmployeeRef()
}
