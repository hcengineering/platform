//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { type AttachedData, type Class, type Doc, type Hierarchy, type Ref } from '@hcengineering/core'
import type { Resource } from '@hcengineering/platform'
import type { ThemeOptions } from '@hcengineering/theme'
import type { ComponentType, SvelteComponent } from 'svelte'
import type { Answer, AnswerDataOf, Assessment, AssessmentDataOf, Percentage, Question, QuestionDataOf } from './base'

/** @public */
export type QuestionInitFunctionResult<Q extends Question<any>> =
  Q extends Assessment<any, any>
    ? Omit<AttachedData<Q>, 'rank' | 'owner' | 'releasedOn' | 'releasedBy' | 'weight'>
    : Omit<AttachedData<Q>, 'rank' | 'owner' | 'releasedOn' | 'releasedBy'>

/** @public */
export type QuestionInitFunction<Q extends Question<any>> = (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy
) => Promise<QuestionInitFunctionResult<Q>>

/** @public */
export interface QuestionDataPresenterProps<Q extends Question<any>> {
  questionData: QuestionDataOf<Q>
  assessmentData: Q extends Assessment<any, any> ? AssessmentDataOf<Q> : null
}

export type QuestionDataPresenter<Q extends Question<any>> = ComponentType<
SvelteComponent<QuestionDataPresenterProps<Q>>
>

/** @public */
export type QuestionDataEditorPropsSubmit<Q extends Question<any>> = (
  data: Partial<Q extends Assessment<any, any> ? Pick<Q, 'questionData' | 'assessmentData'> : Pick<Q, 'questionData'>>
) => Promise<void>

/** @public */
export interface QuestionDataEditorProps<Q extends Question<any>> {
  questionData: QuestionDataOf<Q>
  assessmentData: Q extends Assessment<any, any> ? AssessmentDataOf<Q> : null
  submit: QuestionDataEditorPropsSubmit<Q>
}

export type QuestionDataEditorComponent<Q extends Question<any>> = SvelteComponent<QuestionDataEditorProps<Q>> & {
  focus: () => void
}

export type QuestionDataEditor<Q extends Question<any>> = ComponentType<QuestionDataEditorComponent<Q>>

/** @public */
export type AnswerDataEditorPropsSubmit<A extends Answer<any, any>> = (data: AnswerDataOf<A>) => Promise<void>

/** @public */
export interface AnswerDataEditorProps<Q extends Question<any>, A extends Answer<Q, any>> {
  questionData: QuestionDataOf<Q>
  answerData: AnswerDataOf<A> | null
  submit: AnswerDataEditorPropsSubmit<A>
}

/** @public */
export type AnswerDataEditor<Q extends Question<any>, A extends Answer<Q, any>> = ComponentType<
SvelteComponent<AnswerDataEditorProps<Q, A>>
>

/** @public */
export interface AnswerDataPresenterProps<Q extends Question<any>, A extends Answer<Q, any>> {
  questionData: QuestionDataOf<Q>
  answerData: AnswerDataOf<A> | null
  assessmentData: Q extends Assessment<any, any> ? AssessmentDataOf<Q> | null : null
  showDiff: boolean
}

/** @public */
export type AnswerDataPresenter<Q extends Question<any>, A extends Answer<Q, any>> = ComponentType<
SvelteComponent<AnswerDataPresenterProps<Q, A>>
>

/** @public */
export interface AnswerDataAssessFunctionResult {
  score: Percentage
}

/** @public */
export type AnswerDataAssessFunction<Q extends Assessment<any, any>, A extends Answer<Q, any>> = (
  answerData: AnswerDataOf<A>,
  assessmentData: AssessmentDataOf<Q>
) => Promise<AnswerDataAssessFunctionResult>

/** @public */
export interface QuestionMixin<Q extends Question<any>, A extends Answer<Q, any>> extends Class<Doc> {
  questionInit: Resource<QuestionInitFunction<Q>>
  questionDataPresenter: Resource<QuestionDataPresenter<Q>>
  questionDataEditor: Resource<QuestionDataEditor<Q>>
  answerClassRef: Ref<Class<A>>
  answerDataPresenter: Resource<AnswerDataPresenter<Q, A>>
  answerDataEditor: Resource<AnswerDataEditor<Q, A>>
  answerDataAssess: Q extends Assessment<any, any> ? Resource<AnswerDataAssessFunction<Q, Answer<Q, any>>> : null
}
