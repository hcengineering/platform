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
import type { Class, Mixin, Ref, Type } from '@hcengineering/core'
import { Asset, plugin } from '@hcengineering/platform'
import {
  CheckboxesOption,
  Checkboxes,
  Info,
  Question,
  QuestionDataEditor,
  RadioButtonsOption,
  RadioButtons,
  Rank,
  Survey,
  QuestionData
} from './types'

export * from './types'

/**
 * @public
 */
export const surveyId = 'survey' as Plugin

/**
 * @public
 */
export default plugin(surveyId, {
  class: {
    CheckboxesOption: '' as Ref<Class<Type<CheckboxesOption>>>,
    Checkboxes: '' as Ref<Class<Checkboxes>>,
    Info: '' as Ref<Class<Info>>,
    Question: '' as Ref<Class<Question>>,
    QuestionData: '' as Ref<Class<QuestionData>>,
    RadioButtonsOption: '' as Ref<Class<Type<RadioButtonsOption>>>,
    RadioButtons: '' as Ref<Class<RadioButtons>>,
    Rank: '' as Ref<Class<Type<Rank>>>,
    Survey: '' as Ref<Class<Survey>>
  },
  mixin: {
    QuestionDataEditor: '' as Ref<Mixin<QuestionDataEditor>>
  },
  string: {
    Checkboxes: '' as IntlString,
    ConfigDescription: '' as IntlString,
    ConfigLabel: '' as IntlString,
    Info: '' as IntlString,
    Option: '' as IntlString,
    Options: '' as IntlString,
    Question: '' as IntlString,
    QuestionData: '' as IntlString,
    QuestionText: '' as IntlString,
    Questions: '' as IntlString,
    RadioButtons: '' as IntlString,
    Rank: '' as IntlString,
    Survey: '' as IntlString,
    Surveys: '' as IntlString,
    SurveyApplication: '' as IntlString,
    SurveyCreate: '' as IntlString,
    SurveyName: '' as IntlString,
    SurveyNamePlaceholder: '' as IntlString
  },
  icon: {
    Checkboxes: '' as Asset,
    Eye: '' as Asset,
    Info: '' as Asset,
    Question: '' as Asset,
    RadioButtons: '' as Asset,
    Survey: '' as Asset,
    SurveyApplication: '' as Asset
  }
})
