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

import { AttachedDoc, Class, CollectionSize, Markup, Ref, Space } from '@hcengineering/core'

/**
 * @public
 *
 * @link https://www.npmjs.com/package/lexorank
 */
export type Rank = string

/**
 * @public
 */
export interface Survey extends Space {
  questions: CollectionSize<Question>
}

/**
 * @public
 */
export interface Question extends AttachedDoc {
  attachedTo: Ref<Survey>
  attachedToClass: Ref<Class<Survey>>
  rank: Rank
}

export interface RadioButtonsOption {
  label: string
}

export interface RadioButtonsQuestion extends Question {
  text: string
  options: RadioButtonsOption[]
}

export interface CheckboxesOption {
  label: string
}

export interface CheckboxesQuestion extends Question {
  text: string
  options: CheckboxesOption[]
}

export interface InfoQuestion extends Question {
  text: Markup
}
