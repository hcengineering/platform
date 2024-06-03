//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type {
  Answer,
  MultipleChoiceAssessment,
  MultipleChoiceAssessmentAnswer,
  MultipleChoiceQuestion,
  MultipleChoiceQuestionAnswer,
  OrderingAssessment,
  OrderingAssessmentAnswer,
  OrderingQuestion,
  OrderingQuestionAnswer,
  Question,
  QuestionMixin,
  SingleChoiceAssessment,
  SingleChoiceAssessmentAnswer,
  SingleChoiceQuestion,
  SingleChoiceQuestionAnswer
} from '@hcengineering/questions'
import { type Class, type MixinData, type Ref } from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import tracker from '@hcengineering/model-tracker'
import view, { createAction } from '@hcengineering/model-view'
import {
  TAnswer,
  TAssessment,
  TMultipleChoiceAnswerData,
  TMultipleChoiceAssessment,
  TMultipleChoiceAssessmentAnswer,
  TMultipleChoiceAssessmentData,
  TMultipleChoiceQuestion,
  TMultipleChoiceQuestionAnswer,
  TMultipleChoiceQuestionData,
  TOrderingAnswerData,
  TOrderingAssessment,
  TOrderingAssessmentAnswer,
  TOrderingAssessmentData,
  TOrderingQuestion,
  TOrderingQuestionAnswer,
  TOrderingQuestionData,
  TQuestion,
  TQuestionMixin,
  TSingleChoiceAnswerData,
  TSingleChoiceAssessment,
  TSingleChoiceAssessmentAnswer,
  TSingleChoiceAssessmentData,
  TSingleChoiceQuestion,
  TSingleChoiceQuestionAnswer,
  TSingleChoiceQuestionData,
  TTypePercentage,
  TTypeQuestionOption,
  TTypeRank
} from './doc-types'
import questions from './plugin'

export { questionsOperation } from './migration'
export { default } from './plugin'
export { questionsId } from '@hcengineering/questions/src/index'
export * from './doc-types'

export function createModel (builder: Builder): void {
  builder.createModel(TTypeRank)

  builder.createModel(TTypePercentage)
  builder.mixin(questions.type.Percentage, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: view.component.NumberEditor
  })

  builder.createModel(TTypeQuestionOption)
  builder.createModel(TQuestion, TAssessment, TAnswer)
  builder.createModel(TQuestionMixin)

  defineActions(builder)
  defineSingleChoice(builder)
  defineMultipleChoice(builder)
  defineOrdering(builder)
}

function defineSingleChoice (builder: Builder): void {
  builder.createModel(TSingleChoiceQuestionData, TSingleChoiceAnswerData)

  defineQuestion<SingleChoiceQuestion, SingleChoiceQuestionAnswer>(
    builder,
    questions.class.SingleChoiceQuestion,
    TSingleChoiceQuestion,
    questions.class.SingleChoiceQuestionAnswer,
    TSingleChoiceQuestionAnswer,
    {
      answerClassRef: questions.class.SingleChoiceQuestionAnswer,
      answerDataAssess: null,
      answerDataEditor: questions.component.SingleChoiceQuestionAnswerDataEditor,
      answerDataPresenter: questions.component.SingleChoiceQuestionAnswerDataPresenter,
      questionInit: questions.function.SingleChoiceQuestionInit,
      questionDataEditor: questions.component.SingleChoiceQuestionDataEditor,
      questionDataPresenter: questions.component.SingleChoiceQuestionDataPresenter
    }
  )

  builder.createModel(TSingleChoiceAssessmentData)

  defineQuestion<SingleChoiceAssessment, SingleChoiceAssessmentAnswer>(
    builder,
    questions.class.SingleChoiceAssessment,
    TSingleChoiceAssessment,
    questions.class.SingleChoiceAssessmentAnswer,
    TSingleChoiceAssessmentAnswer,
    {
      answerClassRef: questions.class.SingleChoiceAssessmentAnswer,
      answerDataAssess: questions.function.SingleChoiceAssessmentAssess,
      answerDataEditor: questions.component.SingleChoiceAssessmentAnswerDataEditor,
      answerDataPresenter: questions.component.SingleChoiceAssessmentAnswerDataPresenter,
      questionInit: questions.function.SingleChoiceAssessmentInit,
      questionDataEditor: questions.component.SingleChoiceAssessmentDataEditor,
      questionDataPresenter: questions.component.SingleChoiceAssessmentDataPresenter
    }
  )
}

function defineMultipleChoice (builder: Builder): void {
  builder.createModel(TMultipleChoiceQuestionData, TMultipleChoiceAnswerData)

  defineQuestion<MultipleChoiceQuestion, MultipleChoiceQuestionAnswer>(
    builder,
    questions.class.MultipleChoiceQuestion,
    TMultipleChoiceQuestion,
    questions.class.MultipleChoiceQuestionAnswer,
    TMultipleChoiceQuestionAnswer,
    {
      answerClassRef: questions.class.MultipleChoiceQuestionAnswer,
      answerDataAssess: null,
      answerDataEditor: questions.component.MultipleChoiceQuestionAnswerDataEditor,
      answerDataPresenter: questions.component.MultipleChoiceQuestionAnswerDataPresenter,
      questionInit: questions.function.MultipleChoiceQuestionInit,
      questionDataEditor: questions.component.MultipleChoiceQuestionDataEditor,
      questionDataPresenter: questions.component.MultipleChoiceQuestionDataPresenter
    }
  )

  builder.createModel(TMultipleChoiceAssessmentData)

  defineQuestion<MultipleChoiceAssessment, MultipleChoiceAssessmentAnswer>(
    builder,
    questions.class.MultipleChoiceAssessment,
    TMultipleChoiceAssessment,
    questions.class.MultipleChoiceAssessmentAnswer,
    TMultipleChoiceAssessmentAnswer,
    {
      answerClassRef: questions.class.MultipleChoiceAssessmentAnswer,
      answerDataAssess: questions.function.MultipleChoiceAssessmentAssess,
      answerDataEditor: questions.component.MultipleChoiceAssessmentAnswerDataEditor,
      answerDataPresenter: questions.component.MultipleChoiceAssessmentAnswerDataPresenter,
      questionInit: questions.function.MultipleChoiceAssessmentInit,
      questionDataEditor: questions.component.MultipleChoiceAssessmentDataEditor,
      questionDataPresenter: questions.component.MultipleChoiceAssessmentDataPresenter
    }
  )
}

function defineOrdering (builder: Builder): void {
  builder.createModel(TOrderingQuestionData, TOrderingAnswerData)

  defineQuestion<OrderingQuestion, OrderingQuestionAnswer>(
    builder,
    questions.class.OrderingQuestion,
    TOrderingQuestion,
    questions.class.OrderingQuestionAnswer,
    TOrderingQuestionAnswer,
    {
      answerClassRef: questions.class.OrderingQuestionAnswer,
      answerDataAssess: null,
      answerDataEditor: questions.component.OrderingQuestionAnswerDataEditor,
      answerDataPresenter: questions.component.OrderingQuestionAnswerDataPresenter,
      questionInit: questions.function.OrderingQuestionInit,
      questionDataEditor: questions.component.OrderingQuestionDataEditor,
      questionDataPresenter: questions.component.OrderingQuestionDataPresenter
    }
  )

  builder.createModel(TOrderingAssessmentData)

  defineQuestion<OrderingAssessment, OrderingAssessmentAnswer>(
    builder,
    questions.class.OrderingAssessment,
    TOrderingAssessment,
    questions.class.OrderingAssessmentAnswer,
    TOrderingAssessmentAnswer,
    {
      answerClassRef: questions.class.OrderingAssessmentAnswer,
      answerDataAssess: questions.function.OrderingAssessmentAssess,
      answerDataEditor: questions.component.OrderingAssessmentAnswerDataEditor,
      answerDataPresenter: questions.component.OrderingAssessmentAnswerDataPresenter,
      questionInit: questions.function.OrderingAssessmentInit,
      questionDataEditor: questions.component.OrderingAssessmentDataEditor,
      questionDataPresenter: questions.component.OrderingAssessmentDataPresenter
    }
  )
}

function defineActions (builder: Builder): void {
  builder.createDoc(
    view.class.ActionCategory,
    core.space.Model,
    {
      label: questions.string.Questions,
      visible: true
    },
    questions.actionCategory.Questions
  )

  builder.mixin(questions.class.Question, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Open, view.action.OpenInNewTab, view.action.Delete, tracker.action.NewRelatedIssue]
  })

  createAction(
    builder,
    {
      action: questions.action.QuestionMoveUpAction,
      visibilityTester: questions.action.QuestionMoveUpIsAvailable,
      input: 'focus',
      label: view.string.MoveUp,
      icon: questions.icon.ArrowUp,
      target: questions.class.Question,
      context: { mode: ['context', 'workbench'], group: 'edit' },
      category: questions.actionCategory.Questions
    },
    questions.action.QuestionMoveUp
  )

  createAction(
    builder,
    {
      action: questions.action.QuestionMoveDownAction,
      visibilityTester: questions.action.QuestionMoveDownIsAvailable,
      input: 'focus',
      label: view.string.MoveDown,
      icon: questions.icon.ArrowDown,
      target: questions.class.Question,
      context: { mode: ['context', 'workbench'], group: 'edit' },
      category: questions.actionCategory.Questions
    },
    questions.action.QuestionMoveDown
  )

  createAction(
    builder,
    {
      action: questions.action.QuestionDuplicateAction,
      visibilityTester: questions.action.QuestionDuplicateIsAvailable,
      input: 'focus',
      label: questions.string.Duplicate,
      icon: questions.icon.Duplicate,
      target: questions.class.Question,
      context: { mode: ['context', 'workbench'], group: 'copy' },
      category: questions.actionCategory.Questions
    },
    questions.action.QuestionDuplicate
  )

  createAction(
    builder,
    {
      override: [view.action.Delete],
      action: questions.action.QuestionDeleteAction,
      visibilityTester: questions.action.QuestionDeleteIsAvailable,
      input: 'any',
      label: view.string.Delete,
      icon: view.icon.Delete,
      target: questions.class.Question,
      context: { mode: ['context', 'workbench'], group: 'remove' },
      category: questions.actionCategory.Questions
    },
    questions.action.QuestionDelete
  )

  builder.mixin(questions.class.Answer, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Open, view.action.OpenInNewTab, view.action.Delete, tracker.action.NewRelatedIssue]
  })
}

function defineQuestion<Q extends Question<any>, A extends Answer<Q, any>> (
  builder: Builder,
  questionClassRef: Ref<Class<Q>>,
  questionModelClass: new () => Q,
  answerClassRef: Ref<Class<A>>,
  answerModelClass: new () => A,
  attributes: MixinData<Class<Q>, QuestionMixin<Q, A>>
): void {
  builder.createModel(questionModelClass, answerModelClass)
  builder.mixin<Class<Q>, QuestionMixin<Q, A>>(questionClassRef, core.class.Class, questions.mixin.QuestionMixin, {
    ...attributes,
    answerClassRef
  })
}
