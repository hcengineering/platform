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

import { type Client, type Ref } from '@hcengineering/core'
import { translate } from '@hcengineering/platform'
import { getCurrentLanguage } from '@hcengineering/theme'
import type { TrainingRequest } from '@hcengineering/training'
import training from '../plugin'

export async function trainingRequestObjectTitleProvider (
  client: Client,
  ref: Ref<TrainingRequest>,
  doc?: TrainingRequest
): Promise<string> {
  const request = await client.findOne<TrainingRequest>(
    training.class.TrainingRequest,
    {
      _id: ref
    },
    {
      lookup: {
        attachedTo: training.class.Training
      }
    }
  )
  if (request === undefined) {
    throw new Error(`Training request #${ref} not found`)
  }
  const trainingObject = request.$lookup?.attachedTo
  if (trainingObject === undefined) {
    throw new Error(`Training #${request.attachedTo} not found`)
  }

  const revisionLabel = client.getHierarchy().getAttribute(trainingObject._class, 'revision').label
  const revisionString = await translate(revisionLabel, {}, getCurrentLanguage())
  return `${trainingObject.code} • ${trainingObject.title} • ${revisionString} ${trainingObject.revision}`
}
