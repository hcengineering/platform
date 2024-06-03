//
// Copyright © 2024 Hardcore Engineering Inc.
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

import type { Percentage, Question } from '@hcengineering/questions'
import { isAssessment } from './isAssessment'

/**
 * Calculates number of passed answers needed to pass the given score,
 * i.e. the inversion of {@link assessAnswers}
 */
export function calculateAnswersToPass (
  questionsCollection: Array<Question<unknown>>,
  passingScore: Percentage
): {
    assessmentsTotal: number
    answersNeeded: number
  } {
  const assessmentsTotal = questionsCollection.filter(isAssessment).length
  const answersNeeded = Math.ceil((passingScore * assessmentsTotal) / 100)
  return {
    assessmentsTotal,
    answersNeeded
  }
}
