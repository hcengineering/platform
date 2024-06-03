//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { Class, Mixin, Ref, Type } from '@hcengineering/core'
import { type Asset, type IntlString, type Plugin, plugin } from '@hcengineering/platform'
import type {
  Answer,
  Assessment,
  MultipleChoiceAnswerData,
  MultipleChoiceAssessment,
  MultipleChoiceAssessmentAnswer,
  MultipleChoiceAssessmentData,
  MultipleChoiceQuestion,
  MultipleChoiceQuestionAnswer,
  MultipleChoiceQuestionData,
  OrderingAnswerData,
  OrderingAssessment,
  OrderingAssessmentAnswer,
  OrderingAssessmentData,
  OrderingQuestion,
  OrderingQuestionAnswer,
  OrderingQuestionData,
  Percentage,
  Question,
  QuestionMixin,
  QuestionOption,
  Rank,
  SingleChoiceAnswerData,
  SingleChoiceAssessment,
  SingleChoiceAssessmentAnswer,
  SingleChoiceAssessmentData,
  SingleChoiceQuestion,
  SingleChoiceQuestionAnswer,
  SingleChoiceQuestionData
} from './doc-types'

/** @public */
export const questionsId = 'questions' as Plugin

export * from './doc-types'

/** @public */
export default plugin(questionsId, {
  string: {
    Answer: '' as IntlString,
    Answers: '' as IntlString,
    Assessment: '' as IntlString,
    Assessments: '' as IntlString,
    CorrectAnswer: '' as IntlString,
    CorrectAnswers: '' as IntlString,
    Duplicate: '' as IntlString,
    Failed: '' as IntlString,
    MultipleChoice: '' as IntlString,
    MultipleChoiceAssessment: '' as IntlString,
    MultipleChoiceQuestion: '' as IntlString,
    NoQuestions: '' as IntlString,
    Option: '' as IntlString,
    Options: '' as IntlString,
    Ordering: '' as IntlString,
    OrderingAssessment: '' as IntlString,
    OrderingQuestion: '' as IntlString,
    Owner: '' as IntlString,
    Passed: '' as IntlString,
    Question: '' as IntlString,
    Questions: '' as IntlString,
    Rank: '' as IntlString,
    ReleasedBy: '' as IntlString,
    ReleasedDate: '' as IntlString,
    Score: '' as IntlString,
    SingleChoice: '' as IntlString,
    SingleChoiceAssessment: '' as IntlString,
    SingleChoiceQuestion: '' as IntlString,
    TypePercentage: '' as IntlString,
    TypeQuestionOption: '' as IntlString,
    TypeRank: '' as IntlString
  },
  icon: {
    ArrowDown: '' as Asset,
    ArrowUp: '' as Asset,
    Assessment: '' as Asset,
    Checkbox: '' as Asset,
    Drag: '' as Asset,
    Duplicate: '' as Asset,
    Failed: '' as Asset,
    MiniDrag: '' as Asset,
    Question: '' as Asset,
    Passed: '' as Asset,
    RadioButton: '' as Asset
  },
  class: {
    Answer: '' as Ref<Class<Answer<Question<any>, any>>>,
    Assessment: '' as Ref<Class<Assessment<any, any>>>,
    MultipleChoiceAnswerData: '' as Ref<Class<Type<MultipleChoiceAnswerData>>>,
    MultipleChoiceAssessment: '' as Ref<Class<MultipleChoiceAssessment>>,
    MultipleChoiceAssessmentAnswer: '' as Ref<Class<MultipleChoiceAssessmentAnswer>>,
    MultipleChoiceAssessmentData: '' as Ref<Class<Type<MultipleChoiceAssessmentData>>>,
    MultipleChoiceQuestion: '' as Ref<Class<MultipleChoiceQuestion>>,
    MultipleChoiceQuestionAnswer: '' as Ref<Class<MultipleChoiceQuestionAnswer>>,
    MultipleChoiceQuestionData: '' as Ref<Class<Type<MultipleChoiceQuestionData>>>,
    OrderingAnswerData: '' as Ref<Class<Type<OrderingAnswerData>>>,
    OrderingAssessment: '' as Ref<Class<OrderingAssessment>>,
    OrderingAssessmentAnswer: '' as Ref<Class<OrderingAssessmentAnswer>>,
    OrderingAssessmentData: '' as Ref<Class<Type<OrderingAssessmentData>>>,
    OrderingQuestion: '' as Ref<Class<OrderingQuestion>>,
    OrderingQuestionAnswer: '' as Ref<Class<OrderingQuestionAnswer>>,
    OrderingQuestionData: '' as Ref<Class<Type<OrderingQuestionData>>>,
    Question: '' as Ref<Class<Question<any>>>,
    SingleChoiceAnswerData: '' as Ref<Class<Type<SingleChoiceAnswerData>>>,
    SingleChoiceAssessment: '' as Ref<Class<SingleChoiceAssessment>>,
    SingleChoiceAssessmentAnswer: '' as Ref<Class<SingleChoiceAssessmentAnswer>>,
    SingleChoiceAssessmentData: '' as Ref<Class<Type<SingleChoiceAssessmentData>>>,
    SingleChoiceQuestion: '' as Ref<Class<SingleChoiceQuestion>>,
    SingleChoiceQuestionAnswer: '' as Ref<Class<SingleChoiceQuestionAnswer>>,
    SingleChoiceQuestionData: '' as Ref<Class<Type<SingleChoiceQuestionData>>>
  },
  type: {
    Percentage: '' as Ref<Class<Type<Percentage>>>,
    QuestionOption: '' as Ref<Class<Type<QuestionOption>>>,
    Rank: '' as Ref<Class<Type<Rank>>>
  },
  mixin: {
    QuestionMixin: '' as Ref<Mixin<QuestionMixin<any, any>>>
  }
})
