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

import { type ViewActionFunction } from '@hcengineering/view'
import { type Answer, type Question, type Survey, type SurveyResult } from '@hcengineering/survey'
import { getClient } from '@hcengineering/presentation'
import { SurveyCanBeTaken } from './SurveyCanBeTaken'
import survey from '../plugin'
import { SortingOrder } from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { getCurrentLanguage } from '@hcengineering/theme'

export const SurveyTake: ViewActionFunction<Survey> = async (objects: Survey | Survey[] | undefined): Promise<void> => {
  if (objects === undefined) {
    return
  }
  if (Array.isArray(objects) && objects.length > 1) {
    throw new Error(`Cannot take ${objects.length} surveys simultaneously`)
  }
  const object = Array.isArray(objects) ? objects[0] : objects
  const can = await SurveyCanBeTaken([object])
  if (!can) {
    throw new Error(`Current user cannot take survey #${object._id}`)
  }

  // TODO: Move to server?
  // TODO: Should we try to create answers lazily?
  const transaction = getClient().apply(object._id)
  const hierarchy = transaction.getHierarchy()

  const questions = await transaction.findAll(
    survey.class.Question,
    { attachedTo: object._id, attachedToClass: object._class },
    { sort: { rank: SortingOrder.Ascending } }
  )

  const resultRef = await transaction.addCollection<Survey, SurveyResult>(
    survey.class.SurveyResult,
    object._id,
    object._id,
    object._class,
    'results',
    {
      answers: 0
    }
  )

  await Promise.all(
    questions.map(async (question) => {
      const questionClass = hierarchy.getClass<Question>(question._class)
      const questionType = hierarchy.as(questionClass, survey.mixin.QuestionType)
      const initAnswerData = await getResource(questionType.initAnswerData)
      const answerData = await initAnswerData(getCurrentLanguage(), hierarchy, question)
      return await transaction.addCollection<SurveyResult, Answer<any>>(
        survey.class.Answer,
        object._id,
        resultRef,
        survey.class.SurveyResult,
        'answers',
        {
          answer: answerData,
          question: question._id,
          questionClass: question._class,
          score: 0
        }
      )
    })
  )

  await transaction.commit()

  // TODO: Navigate to newly created SurveyResult
}
