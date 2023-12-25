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
  type AttachedData,
  type AttachedDoc,
  type Class,
  type CollectionSize,
  type Doc,
  Hierarchy,
  type Markup,
  type Ref,
  type Space
} from '@hcengineering/core'
import { type Attachment } from '@hcengineering/attachment'
import { type Person } from '@hcengineering/contact'
import { type ComponentType, type SvelteComponent } from 'svelte'
import { type Resource } from '@hcengineering/platform'
import { ThemeOptions } from '@hcengineering/theme'

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
  requests: CollectionSize<SurveyRequest>
  // TODO: isAssessment: boolean
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
export interface SurveyRequest extends AttachedDoc<Survey, 'requests', Survey> {
  // TODO: Should it be Employee, no?
  // TODO: Should it be an array of assignees instead?
  assignee: Ref<Person>

  results: CollectionSize<SurveyResult>
  // TODO: maxAttempts?: number
  // TODO: dueDate?: Timestamp
}

/** @public */
export interface SurveyResult extends AttachedDoc<SurveyRequest, 'results', Survey> {
  answers: CollectionSize<Answer<any>>
}

/** @public */
export interface Answer<TQuestion extends Question> extends AttachedDoc<SurveyResult, 'answers', Survey> {
  questionClass: Ref<Class<TQuestion>>
  question: Ref<TQuestion>
  answer: AnswerDataOf<TQuestion>
  score?: Fraction
}

/** @public */
export interface QuestionTypeEditorComponentProps<Q extends Question> {
  readonly object: Q
  readonly editable: boolean
  readonly submit: (data: Partial<Q>) => Promise<void>
}

/** @public */
export type QuestionTypeEditorComponentType<Q extends Question> = ComponentType<
SvelteComponent<QuestionTypeEditorComponentProps<Q>>
>

/** @public */
export type QuestionTypeInitQuestionFunction<Q extends Question> = (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy,
  prevRank: Rank | null,
  nextRank: Rank | null
) => Promise<AttachedData<Q>>

/** @public */
export type QuestionTypeInitAssessmentDataFunction<Q extends Question> = (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy,
  question: Q
) => Promise<AssessmentDataOf<Q>>

/** @public */
export interface QuestionType<Q extends Question = Question> extends Class<Doc> {
  editor: Resource<QuestionTypeEditorComponentType<Q>>
  initQuestion: Resource<QuestionTypeInitQuestionFunction<Q>>
  // If initAssessmentData is not defined, we assume that the question cannot be assessable
  initAssessmentData?: Resource<QuestionTypeInitAssessmentDataFunction<Q>>
}
