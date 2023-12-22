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

import { AttachedDoc, Class, CollectionSize, Doc, Markup, Ref, Space } from '@hcengineering/core'
import { Attachment } from '@hcengineering/attachment'
import { Person } from '@hcengineering/contact'
import { ComponentType, SvelteComponent } from 'svelte'
import { Resource } from '@hcengineering/platform'

/**
 * @public
 *
 * @link https://www.npmjs.com/package/lexorank
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
  requests: CollectionSize<Request>
  // TODO: isAssessment: boolean
}

/** @public */
export interface Question extends AttachedDoc<Survey, 'questions', Survey> {
  title: Markup
  rank: Rank
  attachments: CollectionSize<Attachment>
  assessment?: AssessmentData<this>
}

/** @public */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface AssessmentData<Q extends Question> {
  weight: number
}

/** @public */
// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-unused-vars
export interface AnswerData<Q extends Question> {}

/** @public */
export interface QuestionOption {
  label: string
}

/** @public */
export interface SingleChoiceQuestion extends Question {
  options: QuestionOption[]
  shuffle: boolean
}

/** @public */
export interface SingleChoiceAnswerData extends AnswerData<SingleChoiceQuestion> {
  selection?: number
}

/** @public */
export interface SingleChoiceAssessmentData extends AssessmentData<SingleChoiceQuestion> {
  correctAnswer: SingleChoiceAnswerData
}

/** @public */
export interface MultipleChoiceQuestion extends Question {
  options: QuestionOption[]
  shuffle: boolean
}

/** @public */
export interface MultipleChoiceAnswerData extends AnswerData<MultipleChoiceQuestion> {
  selections: number[]
}

/** @public */
export interface MultipleChoiceAssessmentData extends AssessmentData<MultipleChoiceQuestion> {
  correctAnswer: MultipleChoiceAnswerData
}

/** @public */
export interface ReorderQuestion extends Question {
  options: QuestionOption[]
  shuffle: boolean
}

/** @public */
export interface ReorderAnswerData extends AnswerData<ReorderQuestion> {
  order: number[]
}

/** @public */
export interface ReorderAssessmentData extends AssessmentData<ReorderQuestion> {
  correctAnswer: ReorderAnswerData
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

export interface SurveyResult extends AttachedDoc<SurveyRequest, 'results', Survey> {
  answers: CollectionSize<Answer<any>>
}

export interface Answer<Q extends Question> extends AttachedDoc<SurveyResult, 'answers', Survey> {
  questionClass: Ref<Class<Q>>
  question: Ref<Q>
  answer: AnswerData<Q>
  score?: Fraction
}

/** @public */
export interface QuestionEditorComponentProps<Q extends Question> {
  readonly object: Q
  readonly editable: boolean
  readonly submit: (data: Partial<Q>) => Promise<void>
}

/** @public */
export type QuestionEditorComponent<Q extends Question> = SvelteComponent<QuestionEditorComponentProps<Q>>

/** @public */
export type QuestionEditorComponentTypeRef<Q extends Question> = Resource<ComponentType<QuestionEditorComponent<Q>>>

/** @public */
export interface QuestionEditor<Q extends Question = Question> extends Class<Doc> {
  editor: QuestionEditorComponentTypeRef<Q>
}
