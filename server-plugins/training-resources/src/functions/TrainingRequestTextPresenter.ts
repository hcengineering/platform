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

import type { TriggerControl } from '@hcengineering/server-core'
import type { Presenter } from '@hcengineering/server-notification'
import type { TrainingRequest } from '@hcengineering/training'
import training from '@hcengineering/training'

/** @public */
export const TrainingRequestTextPresenter: Presenter<TrainingRequest> = async (
  request: TrainingRequest,
  control: TriggerControl
) => {
  const trainingObject = (await control.findAll(control.ctx, training.class.Training, { _id: request.attachedTo }))[0]

  if (trainingObject === undefined) {
    throw new Error(`Training #${request.attachedTo} not found`)
  }

  return `${trainingObject.code} • ${trainingObject.title} • Revision ${trainingObject.revision}`
}
