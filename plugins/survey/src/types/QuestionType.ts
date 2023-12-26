import { Answer, AnswerDataOf, type AssessmentDataOf, type Question, type Rank } from './base'
import { type Class, type Doc, type DocData, type Hierarchy } from '@hcengineering/core'
import { type Resource } from '@hcengineering/platform'
import { type ThemeOptions } from '@hcengineering/theme'
import { type ComponentType, type SvelteComponent } from 'svelte'

/** @public */
export interface QuestionTypeEditorComponentProps<TQuestion extends Question> {
  readonly question: TQuestion
  readonly editable: boolean
  readonly submit: (data: Partial<TQuestion>) => Promise<void>
}

/** @public */
export type QuestionTypeEditorComponentType<TQuestion extends Question> = ComponentType<
SvelteComponent<QuestionTypeEditorComponentProps<TQuestion>>
>

/** @public */
export type QuestionTypeInitQuestionFunction<TQuestion extends Question> = (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy,
  prevRank: Rank | null,
  nextRank: Rank | null
) => Promise<DocData<TQuestion>>

/** @public */
export type QuestionTypeInitAssessmentDataFunction<TQuestion extends Question> = (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy,
  question: TQuestion
) => Promise<AssessmentDataOf<TQuestion>>

/** @public */
export interface QuestionTypePlayerComponentProps<
  TQuestion extends Question,
  TAnswerData extends AnswerDataOf<TQuestion> = AnswerDataOf<TQuestion>
> {
  readonly question: TQuestion
  readonly answer: Answer<TQuestion, TAnswerData>
  readonly editable: boolean
  readonly submit: (data: Partial<Answer<TQuestion, TAnswerData>>) => Promise<void>
}

/** @public */
export type QuestionTypePlayerComponentType<TQuestion extends Question> = ComponentType<
SvelteComponent<QuestionTypePlayerComponentProps<TQuestion>>
>

/** @public */
export type QuestionTypeInitAnswerDataFunction<
  TQuestion extends Question,
  TAnswerData extends AnswerDataOf<TQuestion>
> = (language: ThemeOptions['language'], hierarchy: Hierarchy, question: TQuestion) => Promise<TAnswerData>

/** @public */
export interface QuestionType<
  TQuestion extends Question = Question,
  TAnswerData extends AnswerDataOf<TQuestion> = AnswerDataOf<TQuestion>
> extends Class<Doc> {
  initQuestion: Resource<QuestionTypeInitQuestionFunction<TQuestion>>
  // If initAssessmentData is not defined, we assume that the question cannot be assessable
  initAssessmentData?: Resource<QuestionTypeInitAssessmentDataFunction<TQuestion>>
  editor: Resource<QuestionTypeEditorComponentType<TQuestion>>
  initAnswerData: Resource<QuestionTypeInitAnswerDataFunction<TQuestion, TAnswerData>>
  player: Resource<QuestionTypePlayerComponentType<TQuestion>>
}
