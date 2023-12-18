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
