//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { findQuestions, updateQuestion } from '@hcengineering/questions-resources'
import type { Training } from '@hcengineering/training'
import type { Employee } from '@hcengineering/contact'
import type { Ref } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { canChangeTrainingOwner } from './canChangeTrainingOwner'

export async function changeTrainingOwner (training: Training, owner: Ref<Employee>): Promise<void> {
  if (!canChangeTrainingOwner(training)) {
    return
  }
  const ops = getClient().apply()

  await ops.updateDoc(training._class, training.space, training._id, {
    owner
  })

  const trainingQuestions = await findQuestions(training, 'questions')
  await Promise.all(
    trainingQuestions.map(async (question) => {
      await updateQuestion(ops, question, { owner })
    })
  )

  await ops.commit()
}
