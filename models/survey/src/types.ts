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

import { type CollectionSize, type Domain, IndexKind, type Markup, type Ref, type Type } from '@hcengineering/core'
import core, { TAttachedDoc, TSpace } from '@hcengineering/model-core'

import {
  ArrOf,
  Collection,
  Hidden,
  Index,
  Model,
  Prop,
  TypeBoolean,
  TypeMarkup,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import survey from './plugin'
import {
  type CheckboxesOption,
  type CheckboxesQuestion,
  type InfoQuestion,
  type Question,
  type RadioButtonsOption,
  type RadioButtonsQuestion,
  type Rank,
  type Survey
} from '@hcengineering/survey'

export const DOMAIN_SURVEY = 'survey' as Domain

/**
 * @public
 */
export function TypeRank (): Type<Rank> {
  return { _class: survey.class.Rank, label: survey.string.Rank }
}

// FIXME: Currently, classes that extend TSpace and represent private spaces
//  cannot be stored in their own domain, as it breaks SpaceSecurityMiddleware.
//  @Model(survey.class.Survey, core.class.Space, DOMAIN_SURVEY)
/**
 * @public
 */
@Model(survey.class.Survey, core.class.Space)
@UX(survey.string.Survey, survey.icon.Survey)
export class TSurvey extends TSpace implements Survey {
  @Prop(TypeString(), survey.string.SurveyName, { defaultValue: '' })
  @Index(IndexKind.FullText)
  declare name: string

  @Prop(TypeString(), core.string.Description, { defaultValue: '' })
  @Hidden()
  declare description: Markup

  @Prop(TypeBoolean(), core.string.Archived, { defaultValue: false })
  @Hidden()
  declare archived: boolean

  @Prop(TypeBoolean(), core.string.Private, { defaultValue: true })
  @Hidden()
  declare private: boolean

  @Prop(Collection(survey.class.Question), survey.string.SurveyQuestions, { defaultValue: 0 })
    questions: CollectionSize<Question> = 0
}

// TODO: Should be abstract
/**
 * @public
 */
@Model(survey.class.Question, core.class.Doc, DOMAIN_SURVEY)
export class TQuestion extends TAttachedDoc implements Question {
  @Prop(TypeRef(survey.class.Survey), core.string.AttachedTo)
  declare attachedTo: Ref<Survey>

  @Prop(TypeRank(), survey.string.Rank)
  @Hidden()
    rank!: Rank
}

/**
 * @public
 */
export function TypeRadioButtonsOption (): Type<RadioButtonsOption> {
  return { _class: survey.class.RadioButtonsOption, label: survey.string.RadioButtonsQuestionOptions }
}

/**
 * @public
 */
@Model(survey.class.RadioButtonsQuestion, survey.class.Question)
@UX(survey.string.RadioButtonsQuestion, survey.icon.RadioButtons)
export class TRadioButtonsQuestion extends TQuestion implements RadioButtonsQuestion {
  @Prop(TypeString(), survey.string.RadioButtonsQuestionText, { defaultValue: '' })
  @Index(IndexKind.FullText)
    text: string = ''

  @Prop(ArrOf(TypeRadioButtonsOption()), survey.string.RadioButtonsQuestionOptions, { defaultValue: [] })
    options: RadioButtonsOption[] = []
}

/**
 * @public
 */
export function TypeCheckboxesOption (): Type<CheckboxesOption> {
  return { _class: survey.class.CheckboxesOption, label: survey.string.CheckboxesQuestionOptions }
}

/**
 * @public
 */
@Model(survey.class.CheckboxesQuestion, survey.class.Question)
@UX(survey.string.CheckboxesQuestion, survey.icon.Checkboxes)
export class TCheckboxesQuestion extends TQuestion implements CheckboxesQuestion {
  @Prop(TypeString(), survey.string.CheckboxesQuestionText, { defaultValue: '' })
  @Index(IndexKind.FullText)
    text: string = ''

  @Prop(ArrOf(TypeCheckboxesOption()), survey.string.CheckboxesQuestionOptions, { defaultValue: [] })
    options: RadioButtonsOption[] = []
}

/**
 * @public
 */
@Model(survey.class.InfoQuestion, survey.class.Question)
export class TInfoQuestion extends TQuestion implements InfoQuestion {
  @Prop(TypeMarkup(), survey.string.InfoQuestionText, { defaultValue: '' })
  @Index(IndexKind.FullText)
    text: string = ''
}
