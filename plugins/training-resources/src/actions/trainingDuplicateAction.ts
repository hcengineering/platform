import { translate } from '@hcengineering/platform'
import { getCurrentLanguage } from '@hcengineering/theme'
import { focusActionWithAvailability } from '@hcengineering/questions-resources'
import { type Training, trainingPrefix, TrainingState } from '@hcengineering/training'
import { getClient } from '@hcengineering/presentation'
import { addNotification } from '@hcengineering/ui'
import TrainingNotification from '../components/TrainingNotification.svelte'
import training from '../plugin'
import {
  copyTrainingQuestions,
  getCurrentEmployeeRef,
  copyTrainingAttachments,
  getNextTrainingSeqNumber,
  canViewTrainingOverview,
  canViewTrainingQuestions,
  canCreateTraining
} from '../utils'

export const trainingDuplicateAction = focusActionWithAvailability<Training>(
  async (object: Training) => {
    return canCreateTraining() && (await canViewTrainingOverview(object)) && canViewTrainingQuestions(object)
  },
  async (object: Training) => {
    const client = getClient()
    const currentEmployeeRef = getCurrentEmployeeRef()

    const ops = client.apply()
    const seqNumber = await getNextTrainingSeqNumber()
    const newTrainingRef = await ops.createDoc(object._class, object.space, {
      title: object.title,
      description: object.description,
      attachments: 0,
      passingScore: object.passingScore,
      code: `${trainingPrefix}-${seqNumber}`,
      state: TrainingState.Draft,
      releasedBy: null,
      releasedOn: null,
      questions: 0,
      requests: 0,
      revision: 1,
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
