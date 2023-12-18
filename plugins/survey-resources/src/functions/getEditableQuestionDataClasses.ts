import { type Class, type TxOperations } from '@hcengineering/core'
import { type QuestionData } from '@hcengineering/survey'

import survey from '../plugin'

export function getEditableQuestionDataClasses (client: TxOperations): Array<Class<QuestionData>> {
  const hierarchy = client.getHierarchy()
  return hierarchy
    .getDescendants(survey.class.QuestionData)
    .map((classRef) => hierarchy.getClass(classRef))
    .filter((_class) => hierarchy.hasMixin(_class, survey.mixin.QuestionDataEditor))
}
