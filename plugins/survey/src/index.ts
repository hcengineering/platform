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

import type { IntlString, Plugin } from '@hcengineering/platform'
import type { AttachedDoc, Class, CollectionSize, Markup, Ref } from '@hcengineering/core'
import type { Attachment } from '@hcengineering/attachment'
import { Asset, plugin } from '@hcengineering/platform'

/**
 * @public
 */
export type Rank = string

/**
 * @public
 *
 * ∈ [0.0, 100.0]
 */
export type Percentage = number

/**
 * @public
 *
 * Arbitrary survey item
 */
export interface SurveyItem extends AttachedDoc {
  rank: Rank
}

/**
 * @public
 *
 * Interactive survey item, e.g. a question
 */
export interface SurveyInteractiveItem extends SurveyItem {
  title: string
}

/**
 * @public
 *
 * Assessable interactive survey item, e.g. a question with correct answers
 */
export interface SurveyAssessableItem extends SurveyInteractiveItem {
  weight: Percentage
}

/**
 * @public
 */
export interface Survey extends AttachedDoc {
  title: string
  description: Markup

  threshold: Percentage
  items: CollectionSize<SurveyItem>
  attachments: CollectionSize<Attachment>
}

/**
 * @public
 */
export const surveyId = 'survey' as Plugin

const survey = plugin(surveyId, {
  class: {
    Survey: '' as Ref<Class<Survey>>,
    SurveyItem: '' as Ref<Class<SurveyItem>>,
    SurveyInteractiveItem: '' as Ref<Class<SurveyInteractiveItem>>,
    SurveyAssessableItem: '' as Ref<Class<SurveyAssessableItem>>
  },
  string: {
    ConfigDescription: '' as IntlString,
    ConfigLabel: '' as IntlString,
    SurveyApplication: '' as IntlString
  },
  icon: {
    SurveyApplication: '' as Asset
  },
  action: {
    // TODO: Declare actions?
  },
  component: {
    // TODO: Declare components?
  }
})

/**
 * @public
 */
export default survey
