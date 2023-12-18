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

import { AttachedDoc, Class, CollectionSize, Doc, Markup, Obj, Ref, Space } from '@hcengineering/core'
import { ComponentType, SvelteComponent } from 'svelte'
import type { Resource } from '@hcengineering/platform'

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
export interface Question<Data extends QuestionData = QuestionData> extends AttachedDoc {
  attachedTo: Ref<Survey>
  attachedToClass: Ref<Class<Survey>>
  rank: Rank
  data: Data
}

/**
 * @public
 *
 * Base marker interface for every question data implementation
 */
export interface QuestionData extends Obj {}

/**
 * @public
 */
export interface RadioButtonsOption {
  label: string
}

/**
 * @public
 */
export interface RadioButtons extends QuestionData {
  text: string
  options: RadioButtonsOption[]
}

/**
 * @public
 */
export interface CheckboxesOption {
  label: string
}

/**
 * @public
 */
export interface Checkboxes extends QuestionData {
  text: string
  options: CheckboxesOption[]
}

/**
 * @public
 */
export interface Info extends QuestionData {
  text: Markup
}

/**
 * @public
 */
export type QuestionDataEditorComponent<Q extends QuestionData> = Resource<
ComponentType<
SvelteComponent<{
  data: Q
  readonly editable: boolean
}>
>
>

/**
 * @public
 */
export interface QuestionDataEditor<Q extends QuestionData = QuestionData> extends Class<Doc> {
  editor: QuestionDataEditorComponent<Q>
}
