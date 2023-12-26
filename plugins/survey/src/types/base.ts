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
  Account,
  type AttachedDoc,
  type Class,
  type CollectionSize,
  type Markup,
  type Ref,
  type Space,
  Timestamp
} from '@hcengineering/core'
import { type Attachment } from '@hcengineering/attachment'

/**
 * @public
 *
 * @link https://www.npmjs.com/package/lexorank
 *
 * TODO: Move to core?
 */
export type Rank = string

/**
 * ∈ [0, 1]
 */
export type Fraction = number

/** @public */
export interface Survey extends Space {
  name: string
  questions: CollectionSize<Question>
  results: CollectionSize<SurveyResult>
}

/** @public */
export interface Question<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TAnswerData = unknown,
  TAssessmentData extends AssessmentData = AssessmentData
> extends AttachedDoc<Survey, 'questions', Survey> {
  title: Markup
  rank: Rank
  attachments: CollectionSize<Attachment>
  assessment: TAssessmentData | null
}

/** @public */
export type AnswerDataOf<TQuestion extends Question> = TQuestion extends Question<infer TAnswerData>
  ? TAnswerData
  : never

/** @public */
export type AssessmentDataOf<TQuestion extends Question> = TQuestion extends Question<any, infer TAssessmentData>
  ? TAssessmentData
  : never

/** @public */
export interface AssessmentData {
  weight: number
}

/** @public */
export interface QuestionOption {
  label: string
}

/** @public */
export interface SurveyResult extends AttachedDoc<Survey, 'results', Survey> {
  answers: CollectionSize<Answer<any>>
  submittedOn?: Timestamp
  submittedBy?: Ref<Account>
}

/** @public */
export interface Answer<
  TQuestion extends Question,
  TAnswerData extends AnswerDataOf<TQuestion> = AnswerDataOf<TQuestion>
> extends AttachedDoc<SurveyResult, 'answers', Survey> {
  questionClass: Ref<Class<TQuestion>>
  question: Ref<TQuestion>
  answer: TAnswerData
  score?: Fraction
}
