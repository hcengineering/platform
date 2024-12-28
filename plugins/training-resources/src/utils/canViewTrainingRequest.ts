//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { checkMyPermission, permissionsStore } from '@hcengineering/contact-resources'
import type { TrainingRequest } from '@hcengineering/training'
import { get } from 'svelte/store'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'
import training from '../plugin'

export function canViewTrainingRequest (object: TrainingRequest): boolean {
  return (
    object.owner === getCurrentEmployeeRef() ||
    checkMyPermission(training.permission.ViewSomeoneElsesSentRequest, object.space, get(permissionsStore)) ||
    (object.trainees.includes(getCurrentEmployeeRef()) && object.canceledOn === null)
  )
}
