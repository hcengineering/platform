import { type Class } from '@hcengineering/core'
import { type QuestionData } from '@hcengineering/survey'

import survey from '../plugin'
import { getClient } from '@hcengineering/presentation'

export function getEditableQuestionClasses (): Array<Class<QuestionData>> {
  const hierarchy = getClient().getHierarchy()
  return hierarchy
    .getDescendants(survey.class.QuestionData)
    .map((classRef) => hierarchy.getClass(classRef))
    .filter((_class) => hierarchy.hasMixin(_class, survey.mixin.QuestionDataEditor))
}
