//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { type Resources } from '@hcengineering/platform'
import { questionDeleteAction } from './actions/questionDeleteAction'
import { questionDuplicateAction } from './actions/questionDuplicateAction'
import { questionMoveDownAction } from './actions/questionMoveDownAction'
import { questionMoveUpAction } from './actions/questionMoveUpAction'
import MultipleChoiceAnswerDataEditor from './components/MultipleChoiceAnswerDataEditor.svelte'
import MultipleChoiceQuestionDataEditor from './components/MultipleChoiceQuestionDataEditor.svelte'
import OrderingAnswerDataEditor from './components/OrderingAnswerDataEditor.svelte'
import OrderingQuestionDataEditor from './components/OrderingQuestionDataEditor.svelte'
import SingleChoiceAnswerDataEditor from './components/SingleChoiceAnswerDataEditor.svelte'
import SingleChoiceQuestionDataEditor from './components/SingleChoiceQuestionDataEditor.svelte'
import { MultipleChoiceAssessmentAssess } from './functions/MultipleChoiceAssessmentAssess'
import { MultipleChoiceAssessmentInit } from './functions/MultipleChoiceAssessmentInit'
import { MultipleChoiceQuestionInit } from './functions/MultipleChoiceQuestionInit'
import { OrderingAssessmentAssess } from './functions/OrderingAssessmentAssess'
import { OrderingAssessmentInit } from './functions/OrderingAssessmentInit'
import { OrderingQuestionInit } from './functions/OrderingQuestionInit'
import { SingleChoiceAssessmentAssess } from './functions/SingleChoiceAssessmentAssess'

import { SingleChoiceAssessmentInit } from './functions/SingleChoiceAssessmentInit'
import { SingleChoiceQuestionInit } from './functions/SingleChoiceQuestionInit'

export { default as QuestionsCollectionEditor } from './components/QuestionsCollectionEditor.svelte'
export { default as AnswersCollectionEditor } from './components/AnswersCollectionEditor.svelte'

export * from './actions/ActionWithAvailability'
export * from './utils'

export default async (): Promise<Resources> => ({
  action: {
    QuestionDeleteAction: questionDeleteAction.action,
    QuestionDeleteIsAvailable: questionDeleteAction.isAvailable,

    QuestionDuplicateAction: questionDuplicateAction.action,
    QuestionDuplicateIsAvailable: questionDuplicateAction.isAvailable,

    QuestionMoveDownAction: questionMoveDownAction.action,
    QuestionMoveDownIsAvailable: questionMoveDownAction.isAvailable,

    QuestionMoveUpAction: questionMoveUpAction.action,
    QuestionMoveUpIsAvailable: questionMoveUpAction.isAvailable
  },
  component: {
    // MultipleChoiceAssessment
    MultipleChoiceAssessmentDataEditor: MultipleChoiceQuestionDataEditor,
    MultipleChoiceAssessmentDataPresenter: MultipleChoiceQuestionDataEditor,
    MultipleChoiceAssessmentAnswerDataEditor: MultipleChoiceAnswerDataEditor,
    MultipleChoiceAssessmentAnswerDataPresenter: MultipleChoiceAnswerDataEditor,

    // MultipleChoiceQuestion
    MultipleChoiceQuestionDataEditor,
    MultipleChoiceQuestionDataPresenter: MultipleChoiceQuestionDataEditor,
    MultipleChoiceQuestionAnswerDataEditor: MultipleChoiceAnswerDataEditor,
    MultipleChoiceQuestionAnswerDataPresenter: MultipleChoiceAnswerDataEditor,

    // OrderingAssessment
    OrderingAssessmentDataEditor: OrderingQuestionDataEditor,
    OrderingAssessmentDataPresenter: OrderingQuestionDataEditor,
    OrderingAssessmentAnswerDataEditor: OrderingAnswerDataEditor,
    OrderingAssessmentAnswerDataPresenter: OrderingAnswerDataEditor,

    // OrderingQuestion
    OrderingQuestionDataEditor,
    OrderingQuestionDataPresenter: OrderingQuestionDataEditor,
    OrderingQuestionAnswerDataEditor: OrderingAnswerDataEditor,
    OrderingQuestionAnswerDataPresenter: OrderingAnswerDataEditor,

    // SingleChoiceAssessment
    SingleChoiceAssessmentDataEditor: SingleChoiceQuestionDataEditor,
    SingleChoiceAssessmentDataPresenter: SingleChoiceQuestionDataEditor,
    SingleChoiceAssessmentAnswerDataEditor: SingleChoiceAnswerDataEditor,
    SingleChoiceAssessmentAnswerDataPresenter: SingleChoiceAnswerDataEditor,

    // SingleChoiceQuestion
    SingleChoiceQuestionDataEditor,
    SingleChoiceQuestionDataPresenter: SingleChoiceQuestionDataEditor,
    SingleChoiceQuestionAnswerDataEditor: SingleChoiceAnswerDataEditor,
    SingleChoiceQuestionAnswerDataPresenter: SingleChoiceAnswerDataEditor
  },
  function: {
    // MultipleChoice
    MultipleChoiceAssessmentAssess,
    MultipleChoiceAssessmentInit,
    MultipleChoiceQuestionInit,

    // Ordering
    OrderingAssessmentAssess,
    OrderingAssessmentInit,
    OrderingQuestionInit,

    // SingleChoice
    SingleChoiceAssessmentAssess,
    SingleChoiceAssessmentInit,
    SingleChoiceQuestionInit
  }
})
