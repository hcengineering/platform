//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { type ViewActionFunction } from '@hcengineering/view'
import { type Survey } from '@hcengineering/survey'
import { getClient } from '@hcengineering/presentation'
import { SurveyCanBeUnpublished } from './SurveyCanBeUnpublished'

export const SurveyUnpublish: ViewActionFunction<Survey> = async (
  objects: Survey | Survey[] | undefined
): Promise<void> => {
  if (objects === undefined) {
    return
  }
  await Promise.all(
    (Array.isArray(objects) ? objects : [objects]).map(async (object) => {
      const can = await SurveyCanBeUnpublished([object])
      if (!can) {
        throw new Error(`Survey #${object._id} cannot be unpublished`)
      }
      await getClient().updateDoc(object._class, object.space, object._id, { private: true })
    })
  )
}
