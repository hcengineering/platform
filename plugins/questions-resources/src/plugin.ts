//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import questions, {
  type AnswerDataAssessFunction,
  type AnswerDataEditor,
  type AnswerDataPresenter,
  type MultipleChoiceAssessment,
  type MultipleChoiceAssessmentAnswer,
  type MultipleChoiceQuestion,
  type MultipleChoiceQuestionAnswer,
  type OrderingAssessment,
  type OrderingAssessmentAnswer,
  type OrderingQuestion,
  type OrderingQuestionAnswer,
  type Question,
  type QuestionDataEditor,
  type QuestionDataPresenter,
  type QuestionInitFunction,
  questionsId,
  type SingleChoiceAssessment,
  type SingleChoiceAssessmentAnswer,
  type SingleChoiceQuestion,
  type SingleChoiceQuestionAnswer
} from '@hcengineering/questions'
import type { Ref } from '@hcengineering/core'
import { mergeIds, type Resource } from '@hcengineering/platform'
import type { Action, ViewActionAvailabilityFunction, ViewActionFunction } from '@hcengineering/view'

export default mergeIds(questionsId, questions, {
  action: {
    QuestionDelete: '' as Ref<Action<Question<any>>>,
    QuestionDeleteAction: '' as Resource<ViewActionFunction<Question<any>>>,
    QuestionDeleteIsAvailable: '' as Resource<ViewActionAvailabilityFunction<Question<any>>>,

    QuestionDuplicate: '' as Ref<Action<Question<any>>>,
    QuestionDuplicateAction: '' as Resource<ViewActionFunction<Question<any>>>,
    QuestionDuplicateIsAvailable: '' as Resource<ViewActionAvailabilityFunction<Question<any>>>,

    QuestionMoveDown: '' as Ref<Action<Question<any>>>,
    QuestionMoveDownAction: '' as Resource<ViewActionFunction<Question<any>>>,
    QuestionMoveDownIsAvailable: '' as Resource<ViewActionAvailabilityFunction<Question<any>>>,

    QuestionMoveUp: '' as Ref<Action<Question<any>>>,
    QuestionMoveUpAction: '' as Resource<ViewActionFunction<Question<any>>>,
    QuestionMoveUpIsAvailable: '' as Resource<ViewActionAvailabilityFunction<Question<any>>>
  },
  component: {
    // MultipleChoiceAssessment
    MultipleChoiceAssessmentDataEditor: '' as Resource<QuestionDataEditor<MultipleChoiceAssessment>>,
    MultipleChoiceAssessmentDataPresenter: '' as Resource<QuestionDataPresenter<MultipleChoiceAssessment>>,
    MultipleChoiceAssessmentAnswerDataEditor: '' as Resource<
    AnswerDataEditor<MultipleChoiceAssessment, MultipleChoiceAssessmentAnswer>
    >,
    MultipleChoiceAssessmentAnswerDataPresenter: '' as Resource<
    AnswerDataPresenter<MultipleChoiceAssessment, MultipleChoiceAssessmentAnswer>
    >,

    // MultipleChoiceQuestion
    MultipleChoiceQuestionDataEditor: '' as Resource<QuestionDataEditor<MultipleChoiceQuestion>>,
    MultipleChoiceQuestionDataPresenter: '' as Resource<QuestionDataPresenter<MultipleChoiceQuestion>>,
    MultipleChoiceQuestionAnswerDataEditor: '' as Resource<
    AnswerDataEditor<MultipleChoiceQuestion, MultipleChoiceQuestionAnswer>
    >,
    MultipleChoiceQuestionAnswerDataPresenter: '' as Resource<
    AnswerDataPresenter<MultipleChoiceQuestion, MultipleChoiceQuestionAnswer>
    >,

    // OrderingAssessment
    OrderingAssessmentDataEditor: '' as Resource<QuestionDataEditor<OrderingAssessment>>,
    OrderingAssessmentDataPresenter: '' as Resource<QuestionDataPresenter<OrderingAssessment>>,
    OrderingAssessmentAnswerDataEditor: '' as Resource<AnswerDataEditor<OrderingAssessment, OrderingAssessmentAnswer>>,
    OrderingAssessmentAnswerDataPresenter: '' as Resource<
    AnswerDataPresenter<OrderingAssessment, OrderingAssessmentAnswer>
    >,

    // OrderingQuestion
    OrderingQuestionDataEditor: '' as Resource<QuestionDataEditor<OrderingQuestion>>,
    OrderingQuestionDataPresenter: '' as Resource<QuestionDataPresenter<OrderingQuestion>>,
    OrderingQuestionAnswerDataEditor: '' as Resource<AnswerDataEditor<OrderingQuestion, OrderingQuestionAnswer>>,
    OrderingQuestionAnswerDataPresenter: '' as Resource<AnswerDataPresenter<OrderingQuestion, OrderingQuestionAnswer>>,

    // SingleChoiceAssessment
    SingleChoiceAssessmentDataEditor: '' as Resource<QuestionDataEditor<SingleChoiceAssessment>>,
    SingleChoiceAssessmentDataPresenter: '' as Resource<QuestionDataPresenter<SingleChoiceAssessment>>,
    SingleChoiceAssessmentAnswerDataEditor: '' as Resource<
    AnswerDataEditor<SingleChoiceAssessment, SingleChoiceAssessmentAnswer>
    >,
    SingleChoiceAssessmentAnswerDataPresenter: '' as Resource<
    AnswerDataPresenter<SingleChoiceAssessment, SingleChoiceAssessmentAnswer>
    >,

    // SingleChoiceQuestion
    SingleChoiceQuestionDataEditor: '' as Resource<QuestionDataEditor<SingleChoiceQuestion>>,
    SingleChoiceQuestionDataPresenter: '' as Resource<QuestionDataPresenter<SingleChoiceQuestion>>,
    SingleChoiceQuestionAnswerDataEditor: '' as Resource<
    AnswerDataEditor<SingleChoiceQuestion, SingleChoiceQuestionAnswer>
    >,
    SingleChoiceQuestionAnswerDataPresenter: '' as Resource<
    AnswerDataPresenter<SingleChoiceQuestion, SingleChoiceQuestionAnswer>
    >
  },
  function: {
    // MultipleChoice
    MultipleChoiceAssessmentAssess: '' as Resource<
    AnswerDataAssessFunction<MultipleChoiceAssessment, MultipleChoiceAssessmentAnswer>
    >,
    MultipleChoiceAssessmentInit: '' as Resource<QuestionInitFunction<MultipleChoiceAssessment>>,
    MultipleChoiceQuestionInit: '' as Resource<QuestionInitFunction<MultipleChoiceQuestion>>,

    // Ordering
    OrderingAssessmentAssess: '' as Resource<AnswerDataAssessFunction<OrderingAssessment, OrderingAssessmentAnswer>>,
    OrderingAssessmentInit: '' as Resource<QuestionInitFunction<OrderingAssessment>>,
    OrderingQuestionInit: '' as Resource<QuestionInitFunction<OrderingQuestion>>,

    // SingleChoice
    SingleChoiceAssessmentAssess: '' as Resource<
    AnswerDataAssessFunction<SingleChoiceAssessment, SingleChoiceAssessmentAnswer>
    >,
    SingleChoiceAssessmentInit: '' as Resource<QuestionInitFunction<SingleChoiceAssessment>>,
    SingleChoiceQuestionInit: '' as Resource<QuestionInitFunction<SingleChoiceQuestion>>
  }
})
