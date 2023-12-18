import { type DocData, generateId, getCurrentAccount, type Ref, type TxOperations } from '@hcengineering/core'
import type { Survey } from '@hcengineering/survey'
import survey from '../plugin'
import core from '@hcengineering/core/lib/component'

export async function surveyCreate (client: TxOperations, object: DocData<Survey>): Promise<Ref<Survey>> {
  const owner = getCurrentAccount()
  const id = generateId<Survey>()

  return await client.createDoc(
    survey.class.Survey,
    core.space.Space,
    {
      ...object,
      questions: 0,
      description: `Survey ${object.name}`,
      members: [owner._id],
      private: true,
      archived: false
    },
    id
  )
}
