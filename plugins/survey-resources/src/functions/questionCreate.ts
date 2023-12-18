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

import { type Question, type Survey } from '@hcengineering/survey'
import { type AttachedData, type Ref, type TxOperations } from '@hcengineering/core'
import survey from '../plugin'

export async function questionCreate (
  client: TxOperations,
  attachedTo: Survey,
  object: AttachedData<Question>
): Promise<Ref<Question>> {
  return await client.addCollection<Survey, Question>(
    survey.class.Question,
    attachedTo.space,
    attachedTo._id,
    attachedTo._class,
    'questions',
    object
  )
}
