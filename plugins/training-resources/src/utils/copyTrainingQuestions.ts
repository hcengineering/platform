//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { copyQuestions } from '@hcengineering/questions-resources'
import type { Training } from '@hcengineering/training'
import { type Ref, type TxOperations } from '@hcengineering/core'

export async function copyTrainingQuestions (ops: TxOperations, from: Training, to: Ref<Training>): Promise<void> {
  await copyQuestions(ops, from, 'questions', to)
}
