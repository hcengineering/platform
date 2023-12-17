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

import { type Resources } from '@hcengineering/platform'

import SurveyCreator from './components/SurveyCreator.svelte'
import SurveyNamePresenter from './components/SurveyNamePresenter.svelte'
import OptionsQuestionDataEditor from './components/OptionsQuestionDataEditor.svelte'
import QuestionCollectionEditor from './components/QuestionCollectionEditor.svelte'

export default async (): Promise<Resources> => ({
  component: {
    OptionsQuestionDataEditor,
    QuestionCollectionEditor,
    SurveyCreator,
    SurveyNamePresenter
  }
})
