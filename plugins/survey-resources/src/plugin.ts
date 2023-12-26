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

import survey, {
  type MultipleChoiceAnswerData,
  type MultipleChoiceQuestion,
  type QuestionTypeEditorComponentType,
  type QuestionTypeInitAnswerDataFunction,
  type QuestionTypeInitAssessmentDataFunction,
  type QuestionTypeInitQuestionFunction,
  type QuestionTypePlayerComponentType,
  type SingleChoiceAnswerData,
  type SingleChoiceQuestion,
  type Survey,
  surveyId
} from '@hcengineering/survey'
import { mergeIds, type Resource } from '@hcengineering/platform'
import { type ComponentType } from 'svelte'
import { type ViewActionAvailabilityFunction, type ViewActionFunction } from '@hcengineering/view'

export default mergeIds(surveyId, survey, {
  component: {
    SingleChoiceQuestionEditor: '' as Resource<QuestionTypeEditorComponentType<SingleChoiceQuestion>>,
    SingleChoiceQuestionPlayer: '' as Resource<QuestionTypePlayerComponentType<SingleChoiceQuestion>>,
    MultipleChoiceQuestionEditor: '' as Resource<QuestionTypeEditorComponentType<MultipleChoiceQuestion>>,
    MultipleChoiceQuestionPlayer: '' as Resource<QuestionTypePlayerComponentType<MultipleChoiceQuestion>>,
    QuestionCollectionEditor: '' as Resource<ComponentType>,
    SurveyCreator: '' as Resource<ComponentType>,
    SurveyPresenter: '' as Resource<ComponentType>,
    SurveyResultEditor: '' as Resource<ComponentType>,
    SurveyResultPresenter: '' as Resource<ComponentType>
  },
  function: {
    MultipleChoiceInitAnswerData: '' as Resource<
    QuestionTypeInitAnswerDataFunction<MultipleChoiceQuestion, MultipleChoiceAnswerData>
    >,
    MultipleChoiceInitAssessmentData: '' as Resource<QuestionTypeInitAssessmentDataFunction<MultipleChoiceQuestion>>,
    MultipleChoiceInitQuestion: '' as Resource<QuestionTypeInitQuestionFunction<MultipleChoiceQuestion>>,
    SingleChoiceInitAnswerData: '' as Resource<
    QuestionTypeInitAnswerDataFunction<SingleChoiceQuestion, SingleChoiceAnswerData>
    >,
    SingleChoiceInitAssessmentData: '' as Resource<QuestionTypeInitAssessmentDataFunction<SingleChoiceQuestion>>,
    SingleChoiceInitQuestion: '' as Resource<QuestionTypeInitQuestionFunction<SingleChoiceQuestion>>,
    SurveyCanBePublished: '' as Resource<ViewActionAvailabilityFunction<Survey>>,
    SurveyCanBeTaken: '' as Resource<ViewActionAvailabilityFunction<Survey>>,
    SurveyCanBeUnpublished: '' as Resource<ViewActionAvailabilityFunction<Survey>>,
    SurveyPublish: '' as Resource<ViewActionFunction<Survey>>,
    SurveyTake: '' as Resource<ViewActionFunction<Survey>>,
    SurveyUnpublish: '' as Resource<ViewActionFunction<Survey>>
  }
})
