//
// Copyright © 2023 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type Builder } from '@hcengineering/model'
import { type Class, type Doc, type Ref } from '@hcengineering/core'
import core from '@hcengineering/model-core'
import workbench from '@hcengineering/model-workbench'
import { type AnswerDataOf, type Question, type QuestionType, surveyId } from '@hcengineering/survey'
import survey from './plugin'
import view, { createAction } from '@hcengineering/model-view'
import {
  TAnswer,
  TMultipleChoiceQuestion,
  TQuestion,
  TQuestionType,
  TReorderQuestion,
  TSingleChoiceQuestion,
  TSurvey,
  TSurveyResult,
  TTypeAnswerData,
  TTypeMultipleChoiceAssessmentData,
  TTypeRank,
  TTypeReorderAssessmentData,
  TTypeSingleChoiceAssessmentData
} from './types'

export { surveyOperation } from './migration'
export { surveyId } from '@hcengineering/survey'
export { default } from './plugin'

export enum SurveyRoutingParts {
  SurveysId = 'surveys',
  ResultsId = 'results'
}

export function createModel (builder: Builder): void {
  defineSurvey(builder)
  defineQuestion(builder)
  defineQuestionTypes(builder)
  defineApplication(builder)
  defineResult(builder)
}

// TODO: Can we make it a decorator for model classes?
export function defineQuestionType<TQuestion extends Question, TAnswerData extends AnswerDataOf<TQuestion>> (
  builder: Builder,
  questionClassRef: Ref<Class<TQuestion>>,
  attributes: Omit<QuestionType<TQuestion, TAnswerData>, keyof Class<Doc>>
): void {
  builder.mixin<Class<TQuestion>, QuestionType<TQuestion>>(
    questionClassRef,
    core.class.Class,
    survey.mixin.QuestionType,
    attributes
  )
}

function defineSurvey (builder: Builder): void {
  builder.createModel(TSurvey)
  builder.mixin(survey.class.Survey, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: survey.component.SurveyPresenter
  })
  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: survey.class.Survey,
      descriptor: view.viewlet.Table,
      config: [
        {
          key: '',
          label: survey.string.SurveyName
        },
        {
          key: 'questions',
          label: survey.string.Questions,
          presenter: view.component.NumberPresenter
        },
        {
          key: 'results',
          label: survey.string.SurveyResults,
          presenter: view.component.NumberPresenter
        },
        'private',
        'createdBy',
        'createdOn',
        'modifiedBy',
        'modifiedOn'
      ],
      configOptions: {
        hiddenKeys: ['name'],
        sortable: true
      }
    },
    survey.viewlet.TableSurvey
  )
  builder.mixin(survey.class.Survey, core.class.Class, view.mixin.IgnoreActions, {
    actions: [
      // TODO: Conditionally disable delete
      view.action.Archive
    ]
  })

  builder.createDoc(
    view.class.ActionCategory,
    core.space.Model,
    {
      label: survey.string.SurveyApplication,
      visible: true
    },
    survey.category.Survey
  )

  // TODO: Add icon?
  createAction(
    builder,
    {
      action: survey.function.SurveyPublish,
      label: survey.string.SurveyPublish,
      target: survey.class.Survey,
      visibilityTester: survey.function.SurveyCanBePublished,
      input: 'focus',
      category: survey.category.Survey,
      context: { mode: ['context', 'workbench'] }
    },
    survey.action.SurveyPublish
  )

  // TODO: Add icon?
  createAction(
    builder,
    {
      action: survey.function.SurveyUnpublish,
      label: survey.string.SurveyUnpublish,
      target: survey.class.Survey,
      visibilityTester: survey.function.SurveyCanBeUnpublished,
      input: 'focus',
      category: survey.category.Survey,
      context: { mode: ['context', 'workbench'] }
    },
    survey.action.SurveyUnpublish
  )

  // TODO: Add icon?
  createAction(
    builder,
    {
      action: survey.function.SurveyTake,
      label: survey.string.SurveyTake,
      target: survey.class.Survey,
      visibilityTester: survey.function.SurveyCanBeTaken,
      input: 'focus',
      category: survey.category.Survey,
      context: { mode: ['context', 'workbench'] }
    },
    survey.action.SurveyTake
  )
}

function defineQuestion (builder: Builder): void {
  builder.createModel(TTypeRank, TQuestion)
  builder.mixin(survey.class.Question, core.class.Class, view.mixin.CollectionEditor, {
    editor: survey.component.QuestionCollectionEditor
  })
}

function defineQuestionTypes (builder: Builder): void {
  builder.createModel(TQuestionType)

  builder.createModel(TTypeSingleChoiceAssessmentData, TSingleChoiceQuestion)
  defineQuestionType(builder, survey.class.SingleChoiceQuestion, {
    initQuestion: survey.function.SingleChoiceInitQuestion,
    initAssessmentData: survey.function.SingleChoiceInitAssessmentData,
    editor: survey.component.SingleChoiceQuestionEditor,
    initAnswerData: survey.function.SingleChoiceInitAnswerData,
    player: survey.component.SingleChoiceQuestionPlayer
  })

  builder.createModel(TTypeMultipleChoiceAssessmentData, TMultipleChoiceQuestion)
  defineQuestionType(builder, survey.class.MultipleChoiceQuestion, {
    initQuestion: survey.function.MultipleChoiceInitQuestion,
    initAssessmentData: survey.function.MultipleChoiceInitAssessmentData,
    editor: survey.component.MultipleChoiceQuestionEditor,
    initAnswerData: survey.function.MultipleChoiceInitAnswerData,
    player: survey.component.MultipleChoiceQuestionPlayer
  })

  builder.createModel(TTypeReorderAssessmentData, TReorderQuestion)
  // TODO: define editor
}

function defineResult (builder: Builder): void {
  builder.createModel(TSurveyResult, TTypeAnswerData, TAnswer)
  builder.mixin(survey.class.SurveyResult, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: survey.component.SurveyResultPresenter
  })
  builder.mixin(survey.class.SurveyResult, core.class.Class, view.mixin.ObjectEditor, {
    editor: survey.component.SurveyResultEditor,
    pinned: false
  })
  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: survey.class.SurveyResult,
      descriptor: view.viewlet.Table,
      config: [
        {
          key: '',
          label: survey.string.SurveyResult
        },
        {
          key: '$lookup.attachedTo',
          label: survey.string.Survey
        },
        {
          key: 'answers',
          label: survey.string.Answers,
          presenter: view.component.NumberPresenter
        },
        'createdBy',
        'createdOn',
        'submittedBy',
        'submittedOn'
      ],
      configOptions: {
        sortable: true
      }
    },
    survey.viewlet.TableSurveyResult
  )
  // TODO: Configure actions
  // builder.mixin(survey.class.SurveyResult, core.class.Class, view.mixin.IgnoreActions, {
  //   actions: [
  //
  //   ]
  // })
}

function defineApplication (builder: Builder): void {
  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: survey.string.SurveyApplication,
      icon: survey.icon.SurveyApplication,
      alias: surveyId,
      hidden: false,
      navigatorModel: {
        spaces: [],
        specials: [
          {
            id: SurveyRoutingParts.SurveysId,
            position: 'top',
            component: workbench.component.SpecialView,
            icon: survey.icon.Survey,
            label: survey.string.Surveys,
            componentProps: {
              _class: survey.class.Survey,
              icon: survey.icon.Survey,
              label: survey.string.Surveys,
              createLabel: survey.string.SurveyCreate,
              createComponent: survey.component.SurveyCreator
            }
          },
          {
            id: SurveyRoutingParts.ResultsId,
            position: 'top',
            component: workbench.component.SpecialView,
            icon: survey.icon.SurveyResult,
            label: survey.string.SurveyResults,
            componentProps: {
              _class: survey.class.SurveyResult,
              icon: survey.icon.SurveyResult,
              label: survey.string.SurveyResults
            }
          }
        ]
      }
    },
    survey.app.SurveyApplication
  )
}
