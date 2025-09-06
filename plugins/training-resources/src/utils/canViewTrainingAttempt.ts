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

import { checkMyPermission, permissionsStore } from '@hcengineering/contact-resources'
import type { Training, TrainingAttempt, TrainingRequest } from '@hcengineering/training'
import { get } from 'svelte/store'
import { getCurrentEmployeeRef } from './getCurrentEmployeeRef'
import training from '../plugin'

export function canViewTrainingAttempt (
  attempt: TrainingAttempt,
  request: TrainingRequest,
  trainingObject: Training
): boolean {
  const currentEmployeeRef = getCurrentEmployeeRef()
  return (
    attempt.attachedTo === request._id &&
    request.attachedTo === trainingObject._id &&
    (request.trainees.includes(currentEmployeeRef) ||
      checkMyPermission(training.permission.ViewSomeoneElsesTraineesResults, attempt.space, get(permissionsStore)) ||
      request.owner === currentEmployeeRef)
  )
}
