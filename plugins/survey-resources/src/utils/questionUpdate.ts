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

import { type AttachedDoc, type DocumentUpdate, type TxOperations } from '@hcengineering/core'
import { type Question } from '@hcengineering/survey'

export async function questionUpdate<Q extends Question> (
  client: TxOperations,
  question: Pick<Q, Extract<keyof AttachedDoc, string>>,
  operations: DocumentUpdate<Q>
): Promise<void> {
  await client.updateCollection(
    question._class,
    question.space,
    question._id,
    question.attachedTo,
    question.attachedToClass,
    question.collection,
    operations
  )
}
