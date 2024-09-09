import { translate } from '@hcengineering/platform'
import { getCurrentLanguage } from '@hcengineering/theme'
import { focusActionWithAvailability } from '@hcengineering/questions-resources'
import { type Training, TrainingState } from '@hcengineering/training'
import { SortingOrder } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { addNotification } from '@hcengineering/ui'
import TrainingNotification from '../components/TrainingNotification.svelte'
import training from '../plugin'
import { canCreateTraining, copyTrainingAttachments, copyTrainingQuestions, getCurrentEmployeeRef } from '../utils'

export const trainingDraftAction = focusActionWithAvailability<Training>(
  async (object: Training) => {
    if (!canCreateTraining() || getCurrentEmployeeRef() !== object.owner || object.state !== TrainingState.Released) {
      return false
    }
    const client = getClient()
    const existingDraft = await client.findOne(object._class, {
      space: object.space,
      code: object.code,
      state: TrainingState.Draft
    })
    return existingDraft === undefined
  },
  async (object: Training) => {
    const client = getClient()
    const currentEmployeeRef = getCurrentEmployeeRef()

    // TODO: Move to server plugins when we have them to avoid concurrency
    const latestRevision = await client.findOne(
      object._class,
      {
        space: object.space,
        code: object.code
      },
      {
        sort: {
          revision: SortingOrder.Descending
        }
      }
    )
    if (latestRevision === undefined) {
      throw new Error(`Could not find a latest revision for training ${object.code}`)
    }

    const ops = client.apply()
    const newTrainingRef = await ops.createDoc(object._class, object.space, {
      title: object.title,
      description: object.description,
      attachments: 0,
      passingScore: object.passingScore,
      code: object.code,
      state: TrainingState.Draft,
      releasedBy: null,
      releasedOn: null,
      questions: 0,
      requests: 0,
      revision: latestRevision.revision + 1,
      owner: currentEmployeeRef,
      author: currentEmployeeRef
    })

    await copyTrainingAttachments(ops, object, newTrainingRef)
    await copyTrainingQuestions(ops, object, newTrainingRef)
    await ops.commit()

    addNotification(
      await translate(training.string.TrainingCreated, {}, getCurrentLanguage()),
      '',
      TrainingNotification,
      { id: newTrainingRef }
    )
  }
)
