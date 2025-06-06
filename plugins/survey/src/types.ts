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

import { AttachedDoc, Doc, Ref } from '@hcengineering/core'

/** @public */
export interface Survey extends Doc {
  name: string
  prompt: string
  questions?: Question[]
}

/** @public */
export enum QuestionKind {
  STRING = 'string',
  OPTION = 'option',
  OPTIONS = 'options'
}

/** @public */
export interface Question {
  name: string
  kind: QuestionKind
  isMandatory: boolean
  options?: string[]
  hasCustomOption: boolean
}

export interface AnsweredQuestion extends Question {
  answer?: string
  answers?: number[]
}

/** @public */
export interface PollData {
  survey: Ref<Survey>
  name: string
  prompt: string
  questions?: AnsweredQuestion[]
  isCompleted?: boolean
}

/** @public */
export interface Poll extends PollData, AttachedDoc {}
