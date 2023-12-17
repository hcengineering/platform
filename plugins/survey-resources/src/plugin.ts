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
  CheckboxesQuestion,
  QuestionDataEditorComponent,
  RadioButtonsQuestion,
  surveyId
} from '@hcengineering/survey'
import { mergeIds } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui'

export default mergeIds(surveyId, survey, {
  component: {
    OptionsQuestionDataEditor: '' as QuestionDataEditorComponent<CheckboxesQuestion | RadioButtonsQuestion>,
    SurveyCreator: '' as AnyComponent,
    SurveyNamePresenter: '' as AnyComponent,
    QuestionCollectionEditor: '' as AnyComponent
  }
})
