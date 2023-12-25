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

import { AssessmentData, Question, QuestionOption } from './base'

/** @public */
export interface SingleChoiceAnswerData {
  // TODO: We probably don't want to let null here
  selection: number | null
}

/** @public */
export interface SingleChoiceAssessmentData extends AssessmentData {
  correctAnswer: SingleChoiceAnswerData
}

/** @public */
export interface SingleChoiceQuestion extends Question<SingleChoiceAnswerData, SingleChoiceAssessmentData> {
  options: QuestionOption[]
  shuffle: boolean
}
