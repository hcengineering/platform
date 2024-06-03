//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { focusActionWithAvailability } from '@hcengineering/questions-resources'
import type { Training } from '@hcengineering/training'
import { showPopup } from '@hcengineering/ui'
import TrainingChangeOwnerPopup from '../components/TrainingChangeOwnerPopup.svelte'
import { canChangeTrainingOwner } from '../utils'

export const trainingChangeOwnerAction = focusActionWithAvailability<Training>(
  async (object: Training) => {
    return canChangeTrainingOwner(object)
  },
  async (object: Training) => {
    await new Promise((resolve) => {
      showPopup(
        TrainingChangeOwnerPopup,
        {
          object
        },
        'top',
        resolve
      )
    })
  }
)
