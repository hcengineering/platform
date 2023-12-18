import { type Question } from '@hcengineering/survey'
import { deleteObject } from '@hcengineering/view-resources'
import { type TxOperations } from '@hcengineering/core'

export async function questionDelete (client: TxOperations, question: Question): Promise<void> {
  await deleteObject(client, question)
}
