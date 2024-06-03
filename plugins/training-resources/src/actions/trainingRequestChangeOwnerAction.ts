//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { focusActionWithAvailability } from '@hcengineering/questions-resources'
import type { TrainingRequest } from '@hcengineering/training'
import { showPopup } from '@hcengineering/ui'
import TrainingRequestChangeOwnerPopup from '../components/TrainingRequestChangeOwnerPopup.svelte'
import { canChangeTrainingRequestOwner } from '../utils'

export const trainingRequestChangeOwnerAction = focusActionWithAvailability<TrainingRequest>(
  async (object: TrainingRequest) => {
    return canChangeTrainingRequestOwner(object)
  },
  async (object: TrainingRequest) => {
    await new Promise((resolve) => {
      showPopup(
        TrainingRequestChangeOwnerPopup,
        {
          object
        },
        'top',
        resolve
      )
    })
  }
)
