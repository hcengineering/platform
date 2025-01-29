import type { Attachment } from '@hcengineering/attachment'
import type { Employee } from '@hcengineering/contact'
import {
  type AttachedDoc,
  type CollectionSize,
  type Doc,
  type Markup,
  type Ref,
  type Timestamp,
  type TypedSpace
} from '@hcengineering/core'
import type { Answer, Percentage, Question } from '@hcengineering/questions'

export const trainingPrefix = 'TR'

export enum TrainingSpecialIds {
  AllTrainings = 'all-trainings',
  IncomingRequests = 'my-requests',
  MyResults = 'my-results',
  MyTrainings = 'my-trainings',
  SentRequests = 'trainees-requests',
  TraineesResults = 'trainees-results'
}

/** @public */
export enum TrainingState {
  Draft = 'draft',
  Released = 'released',
  Archived = 'archived',
  Deleted = 'deleted'
}

/** @public */
export const trainingStateOrder: TrainingState[] = [
  TrainingState.Draft,
  TrainingState.Released,
  TrainingState.Archived,
  TrainingState.Deleted
]

/** @public */
export interface Training extends Doc<TypedSpace> {
  title: string
  code: string
  revision: number
  author: Ref<Employee>
  owner: Ref<Employee>
  state: TrainingState

  description: Markup
  attachments: CollectionSize<Attachment>
  passingScore: Percentage
  releasedOn: Timestamp | null
  releasedBy: Ref<Employee> | null

  questions: CollectionSize<Question<unknown>>
  requests: CollectionSize<TrainingRequest>
}

/** @public */
export interface TrainingRequest extends AttachedDoc<Training, 'requests', TypedSpace> {
  owner: Ref<Employee>
  trainees: Array<Ref<Employee>>
  // TODO: collaborators: Ref<Employee>[]
  dueDate: Timestamp | null
  maxAttempts: number | null
  attempts: CollectionSize<TrainingAttempt>
  canceledOn: Timestamp | null
  canceledBy: Ref<Employee> | null
}

/** @public */
export enum TrainingAttemptState {
  Draft = 'draft',
  Failed = 'failed',
  Passed = 'passed'
}

/** @public */
export const trainingAttemptStateOrder: TrainingAttemptState[] = [
  TrainingAttemptState.Draft,
  TrainingAttemptState.Failed,
  TrainingAttemptState.Passed
]

/** @public */
export interface TrainingAttempt extends AttachedDoc<TrainingRequest, 'attempts', TypedSpace> {
  owner: Ref<Employee>
  seqNumber: number
  answers: CollectionSize<Answer<Question<unknown>, unknown>>
  state: TrainingAttemptState
  submittedOn: Timestamp | null
  submittedBy: Ref<Employee> | null
  /**
   * Resulting score, filled on submission
   */
  score: Percentage | null
  /**
   * Number of assessment questions in related training, filled on submission, used to display results
   */
  assessmentsTotal: number | null
  /**
   * Number of passed assessment questions in related training, filled on submission, used to display results
   */
  assessmentsPassed: number | null
}
