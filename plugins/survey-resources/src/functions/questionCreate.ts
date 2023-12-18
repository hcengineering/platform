import { type Question, type Survey } from '@hcengineering/survey'
import { type AttachedData, type Ref } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import survey from '../plugin'

export async function questionCreate (attachedTo: Survey, object: AttachedData<Question>): Promise<Ref<Question>> {
  const client = getClient()
  return await client.addCollection<Survey, Question>(
    survey.class.Question,
    attachedTo.space,
    attachedTo._id,
    attachedTo._class,
    'questions',
    object
  )
}
