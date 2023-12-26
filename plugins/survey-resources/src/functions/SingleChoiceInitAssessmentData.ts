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

import {
  type QuestionTypeInitAssessmentDataFunction,
  type SingleChoiceAssessmentData,
  type SingleChoiceQuestion
} from '@hcengineering/survey'
import { type ThemeOptions } from '@hcengineering/theme'
import { type Hierarchy } from '@hcengineering/core'

export const SingleChoiceInitAssessmentData: QuestionTypeInitAssessmentDataFunction<SingleChoiceQuestion> = async (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy,
  question: SingleChoiceQuestion
): Promise<SingleChoiceAssessmentData> => {
  return {
    weight: 1,
    correctAnswer: {
      selection: question.options.length > 1 ? 0 : null
    }
  }
}
