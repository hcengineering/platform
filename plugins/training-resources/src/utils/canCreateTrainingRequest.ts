//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { checkMyPermission, permissionsStore } from '@hcengineering/contact-resources'
import { type Training, TrainingState } from '@hcengineering/training'
import { get } from 'svelte/store'
import training from '../plugin'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'

export function canCreateTrainingRequest (parent: Training): boolean {
  return (
    parent.state === TrainingState.Released &&
    (checkMyPermission(training.permission.CreateRequestOnSomeoneElsesTraining, parent.space, get(permissionsStore)) ||
      parent.owner === getCurrentEmployeeRef())
  )
}
