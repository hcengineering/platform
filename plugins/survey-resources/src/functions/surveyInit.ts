import { type DocData, fillDefaults, type TxOperations } from '@hcengineering/core'
import type { Survey } from '@hcengineering/survey'
import survey from '../plugin'

export function surveyInit (client: TxOperations): DocData<Survey> {
  const hierarchy = client.getHierarchy()

  let object: DocData<Survey> = {
    name: '',
    description: '',
    private: true,
    members: [],
    questions: 0,
    archived: false
  }

  object = fillDefaults<Survey>(hierarchy, object, survey.class.Survey)

  return object
}
