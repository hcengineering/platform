//
// Copyright © 2023 Hardcore Engineering Inc.
//

import { findQuestions, focusActionWithAvailability, releaseQuestion } from '@hcengineering/questions-resources'
import { type Training, TrainingState } from '@hcengineering/training'
import { getClient } from '@hcengineering/presentation'
import { getCurrentEmployeeRef, canReleaseTraining } from '../utils'

export const trainingReleaseAction = focusActionWithAvailability<Training>(
  async (object: Training) => {
    return canReleaseTraining(object)
  },
  async (object: Training) => {
    const tx = getClient().apply()

    // There should be only 0 or 1 existing released version,
    // but let's find and archive them all, just in case
    const existingReleases = await tx.findAll(object._class, {
      code: object.code,
      state: TrainingState.Released
    })

    // Archive currently effective trainings
    // TODO: Move to server plugin
    await Promise.all(
      existingReleases.map(async (training) => {
        // Archive training
        await tx.update(training, { state: TrainingState.Archived })

        // Un-release its questions
        const questions = await findQuestions(training, 'questions')
        await Promise.all(
          questions.map(async (question) => {
            await releaseQuestion(tx, question)
          })
        )
      })
    )

    // Release current draft
    const author = getCurrentEmployeeRef()
    await tx.updateDoc(object._class, object.space, object._id, {
      state: TrainingState.Released,
      releasedOn: Date.now(),
      releasedBy: author,
      author
    })

    // Release questions
    const questions = await findQuestions(object, 'questions')
    await Promise.all(
      questions.map(async (question) => {
        await releaseQuestion(tx, question)
      })
    )

    await tx.commit()
  }
)
