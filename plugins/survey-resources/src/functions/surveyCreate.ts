import { type DocData, generateId, getCurrentAccount, type Ref } from '@hcengineering/core'
import type { Survey } from '@hcengineering/survey'
import survey from '../plugin'
import core from '@hcengineering/core/lib/component'
import { getClient } from '@hcengineering/presentation'

export async function surveyCreate (object: DocData<Survey>): Promise<Ref<Survey>> {
  const owner = getCurrentAccount()
  const id = generateId<Survey>()

  return await getClient().createDoc(
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
