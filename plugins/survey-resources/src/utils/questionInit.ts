import { type Question, type QuestionType, type Rank } from '@hcengineering/survey'
import { type Class, type DocData, type Hierarchy, type Ref } from '@hcengineering/core'
import survey from '../plugin'
import { getResource } from '@hcengineering/platform'
import { type ThemeOptions } from '@hcengineering/theme'

export async function questionInit<Q extends Question> (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy,
  classRef: Ref<Class<Q>>,
  prevRank: Rank | null,
  nextRank: Rank | null
): Promise<DocData<Q>> {
  const questionClass = hierarchy.getClass(classRef)
  const questionType = hierarchy.as<Class<Question>, QuestionType<Q>>(questionClass, survey.mixin.QuestionType)
  const initQuestion = await getResource(questionType.initQuestion)
  return await initQuestion(language, hierarchy, prevRank, nextRank)
}
