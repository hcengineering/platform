import { type DocData, fillDefaults } from '@hcengineering/core'
import type { Survey } from '@hcengineering/survey'
import survey from '../plugin'
import { getClient } from '@hcengineering/presentation'

export function surveyInit (): DocData<Survey> {
  const hierarchy = getClient().getHierarchy()

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
