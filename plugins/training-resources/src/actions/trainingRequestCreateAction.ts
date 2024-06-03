//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { focusActionWithAvailability } from '@hcengineering/questions-resources'
import type { Training } from '@hcengineering/training'
import { showPopup } from '@hcengineering/ui'
import TrainingRequestCreator from '../components/TrainingRequestCreator.svelte'
import { canCreateTrainingRequest, type CreateTrainingRequestData } from '../utils'

export const trainingRequestCreateAction = focusActionWithAvailability<Training>(
  async (parent: Training) => {
    return canCreateTrainingRequest(parent)
  },
  async (parent: Training): Promise<void> => {
    const object: CreateTrainingRequestData = {
      roles: [],
      trainees: [],
      maxAttempts: null,
      dueDate: null
    }

    await new Promise((resolve) => {
      showPopup(
        TrainingRequestCreator,
        {
          parent,
          object
        },
        'top',
        resolve
      )
    })
  }
)
