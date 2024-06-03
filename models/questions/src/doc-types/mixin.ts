//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type {
  Answer,
  AnswerDataAssessFunction,
  Assessment,
  Question,
  QuestionInitFunction,
  QuestionMixin,
  QuestionDataPresenter,
  QuestionDataEditor,
  AnswerDataPresenter,
  AnswerDataEditor
} from '@hcengineering/questions'
import type { Class, Ref } from '@hcengineering/core'
import { Mixin } from '@hcengineering/model'
import core, { TClass } from '@hcengineering/model-core'
import type { Resource } from '@hcengineering/platform'
import questions from '../plugin'

/** @public */
@Mixin(questions.mixin.QuestionMixin, core.class.Class)
export class TQuestionMixin<Q extends Question<any>, A extends Answer<Q, any>>
  extends TClass
  implements QuestionMixin<Q, A> {
  questionInit!: Resource<QuestionInitFunction<Q>>
  questionDataPresenter!: Resource<QuestionDataPresenter<Q>>
  questionDataEditor!: Resource<QuestionDataEditor<Q>>
  answerClassRef!: Ref<Class<A>>
  answerDataPresenter!: Resource<AnswerDataPresenter<Q, A>>
  answerDataEditor!: Resource<AnswerDataEditor<Q, A>>
  answerDataAssess!: Q extends Assessment<any, any> ? Resource<AnswerDataAssessFunction<Q, A>> : null
}
