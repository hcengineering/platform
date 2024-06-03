//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { Question } from '@hcengineering/questions'
import { type DocumentUpdate, type TxOperations } from '@hcengineering/core'
import { canUpdateQuestion } from './canUpdateQuestion'

export async function updateQuestion<Q extends Question<unknown>> (
  client: TxOperations,
  question: Q,
  update: DocumentUpdate<Q>
): Promise<void> {
  if (!canUpdateQuestion(question)) {
    return
  }
  await client.updateCollection(
    question._class,
    question.space,
    question._id,
    question.attachedTo,
    question.attachedToClass,
    question.collection,
    update
  )
}
