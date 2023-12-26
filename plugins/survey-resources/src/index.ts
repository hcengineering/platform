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
import QuestionCollectionEditor from './components/QuestionCollectionEditor.svelte'
import { MultipleChoiceInitAssessmentData } from './functions/MultipleChoiceInitAssessmentData'
import { MultipleChoiceInitQuestion } from './functions/MultipleChoiceInitQuestion'
import { SingleChoiceInitAssessmentData } from './functions/SingleChoiceInitAssessmentData'
import { SingleChoiceInitQuestion } from './functions/SingleChoiceInitQuestion'
import MultipleChoiceQuestionEditor from './components/MultipleChoiceQuestionEditor.svelte'
import SingleChoiceQuestionEditor from './components/SingleChoiceQuestionEditor.svelte'
import SurveyPresenter from './components/SurveyPresenter.svelte'
import SurveyResultPresenter from './components/SurveyResultPresenter.svelte'
import { SurveyCanBePublished } from './functions/SurveyCanBePublished'
import { SurveyCanBeUnpublished } from './functions/SurveyCanBeUnpublished'
import { SurveyPublish } from './functions/SurveyPublish'
import { SurveyUnpublish } from './functions/SurveyUnpublish'
import { SurveyCanBeTaken } from './functions/SurveyCanBeTaken'
import { SurveyTake } from './functions/SurveyTake'
import SurveyResultEditor from './components/SurveyResultEditor.svelte'
import MultipleChoiceQuestionPlayer from './components/MultipleChoiceQuestionPlayer.svelte'
import SingleChoiceQuestionPlayer from './components/SingleChoiceQuestionPlayer.svelte'
import { MultipleChoiceInitAnswerData } from './functions/MultipleChoiceInitAnswerData'
import { SingleChoiceInitAnswerData } from './functions/SingleChoiceInitAnswerData'

export default async (): Promise<Resources> => ({
  component: {
    MultipleChoiceQuestionEditor,
    MultipleChoiceQuestionPlayer,
    QuestionCollectionEditor,
    SingleChoiceQuestionEditor,
    SingleChoiceQuestionPlayer,
    SurveyCreator,
    SurveyPresenter,
    SurveyResultEditor,
    SurveyResultPresenter
  },
  function: {
    MultipleChoiceInitAnswerData,
    MultipleChoiceInitAssessmentData,
    MultipleChoiceInitQuestion,
    SingleChoiceInitAnswerData,
    SingleChoiceInitAssessmentData,
    SingleChoiceInitQuestion,
    SurveyCanBePublished,
    SurveyCanBeTaken,
    SurveyCanBeUnpublished,
    SurveyPublish,
    SurveyTake,
    SurveyUnpublish
  }
})
