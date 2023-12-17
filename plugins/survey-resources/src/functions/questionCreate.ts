import { type Question, type Survey } from '@hcengineering/survey'
import { type AttachedData, type Class, type Ref } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'

export async function questionCreate<Q extends Question> (
  survey: Survey,
  classRef: Ref<Class<Q>>,
  object: AttachedData<Q>
): Promise<Ref<Q>> {
  const client = getClient()
  return await client.addCollection<Survey, Q>(
    classRef,
    survey.space,
    survey._id,
    survey._class,
    'questions',
    object
  )
}
