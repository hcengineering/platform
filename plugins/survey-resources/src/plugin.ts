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
  type MultipleChoiceQuestion,
  type QuestionTypeEditorComponentType,
  type QuestionTypeInitAssessmentDataFunction,
  type QuestionTypeInitQuestionFunction,
  type SingleChoiceQuestion,
  surveyId
} from '@hcengineering/survey'
import { mergeIds, type Resource } from '@hcengineering/platform'
import { type ComponentType } from 'svelte'

export default mergeIds(surveyId, survey, {
  component: {
    SingleChoiceQuestionEditor: '' as Resource<QuestionTypeEditorComponentType<SingleChoiceQuestion>>,
    MultipleChoiceQuestionEditor: '' as Resource<QuestionTypeEditorComponentType<MultipleChoiceQuestion>>,
    QuestionCollectionEditor: '' as Resource<ComponentType>,
    SurveyCreator: '' as Resource<ComponentType>,
    SurveyNamePresenter: '' as Resource<ComponentType>
  },
  function: {
    MultipleChoiceInitAssessmentData: '' as Resource<QuestionTypeInitAssessmentDataFunction<MultipleChoiceQuestion>>,
    MultipleChoiceInitQuestion: '' as Resource<QuestionTypeInitQuestionFunction<MultipleChoiceQuestion>>,
    SingleChoiceInitAssessmentData: '' as Resource<QuestionTypeInitAssessmentDataFunction<SingleChoiceQuestion>>,
    SingleChoiceInitQuestion: '' as Resource<QuestionTypeInitQuestionFunction<SingleChoiceQuestion>>
  }
})
