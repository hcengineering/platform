import { type Class } from '@hcengineering/core'
import { type Question } from '@hcengineering/survey'

import survey from '../plugin'
import { getClient } from '@hcengineering/presentation'

export function getEditableQuestionClasses (): Array<Class<Question>> {
  const hierarchy = getClient().getHierarchy()
  return hierarchy
    .getDescendants(survey.class.Question)
    .map((classRef) => hierarchy.getClass(classRef))
    .filter((_class) => hierarchy.hasMixin(_class, survey.mixin.QuestionDataEditor))
}
