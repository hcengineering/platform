//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { TrainingRequest } from '@hcengineering/training'
import type { Employee } from '@hcengineering/contact'
import type { Ref } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { canChangeTrainingRequestOwner } from './canChangeTrainingRequestOwner'

export async function changeTrainingRequestOwner (request: TrainingRequest, owner: Ref<Employee>): Promise<void> {
  if (canChangeTrainingRequestOwner(request)) {
    await getClient().update(request, { owner })
  }
}
