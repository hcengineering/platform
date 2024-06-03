//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { assessAnswers, findAnswers, findQuestions } from '@hcengineering/questions-resources'
import {
  type Training,
  type TrainingAttempt,
  TrainingAttemptState,
  type TrainingRequest
} from '@hcengineering/training'
import { getClient } from '@hcengineering/presentation'
import { canUpdateTrainingAttempt } from './canUpdateTrainingAttempt'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'

export async function submitTrainingAttempt (
  attempt: TrainingAttempt,
  request: TrainingRequest,
  training: Training
): Promise<void> {
  const client = getClient()

  if (!canUpdateTrainingAttempt(attempt, request, training)) {
    return
  }

  const { score, assessmentsPassed, assessmentsTotal } = await assessAnswers(
    await findQuestions(training, 'questions'),
    await findAnswers(attempt, 'answers')
  )

  await client.updateCollection(
    attempt._class,
    attempt.space,
    attempt._id,
    attempt.attachedTo,
    attempt.attachedToClass,
    attempt.collection,
    {
      submittedOn: Date.now(),
      submittedBy: getCurrentEmployeeRef(),
      state: score >= training.passingScore ? TrainingAttemptState.Passed : TrainingAttemptState.Failed,
      score,
      assessmentsPassed,
      assessmentsTotal
    }
  )
}
