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
import { type AttachedData, type Class, type Ref, type TxOperations } from '@hcengineering/core'

export async function questionCreate<Q extends Question> (
  client: TxOperations,
  attachedTo: Survey,
  classRef: Ref<Class<Q>>,
  question: AttachedData<Q>
): Promise<Ref<Q>> {
  return await client.addCollection<Survey, Q>(
    classRef,
    attachedTo._id,
    attachedTo._id,
    attachedTo._class,
    'questions',
    question
  )
}
