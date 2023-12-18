import survey from '../plugin'
import { type AttachedDoc, type Data, type TxOperations } from '@hcengineering/core'
import { type Question } from '@hcengineering/survey'

export async function questionUpdate (
  client: TxOperations,
  question: Pick<Question, Extract<keyof AttachedDoc, string>>,
  operations: Partial<Data<Question>>
): Promise<void> {
  await client.updateCollection(
    survey.class.Question,
    question.space,
    question._id,
    question.attachedTo,
    question.attachedToClass,
    question.collection,
    operations
  )
}
