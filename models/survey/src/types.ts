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
import core, { TAttachedDoc, TClass, TObj, TSpace, TType } from '@hcengineering/model-core'

import {
  ArrOf,
  Collection,
  Hidden,
  Index,
  Mixin,
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
  type Checkboxes,
  type CheckboxesOption,
  type Info,
  type Question,
  type QuestionData,
  type QuestionDataEditor,
  type QuestionDataEditorComponent,
  type RadioButtons,
  type RadioButtonsOption,
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

/**
 * @public
 */
@UX(survey.string.Rank)
@Model(survey.class.Rank, core.class.Type)
export class TTypeRank extends TType {}

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

  @Prop(Collection(survey.class.Question), survey.string.Questions, { defaultValue: 0 })
    questions: CollectionSize<Question> = 0
}

/**
 * @public
 */
@Model(survey.class.Question, core.class.Doc, DOMAIN_SURVEY)
export class TQuestion<Data extends QuestionData> extends TAttachedDoc implements Question<Data> {
  @Prop(TypeRef(survey.class.Survey), core.string.AttachedTo)
  declare attachedTo: Ref<Survey>

  @Prop(TypeRank(), survey.string.Rank)
  @Hidden()
    rank!: Rank

  @Prop(TypeQuestionData(), survey.string.QuestionData)
    data!: Data
}

/**
 * @public
 */
@Model(survey.class.QuestionData, core.class.Obj)
export class TQuestionData extends TObj implements QuestionData {}

export function TypeQuestionData (): Type<QuestionData> {
  return { _class: survey.class.QuestionData, label: survey.string.QuestionData }
}

/**
 * @public
 */
export function TypeRadioButtonsOption (): Type<RadioButtonsOption> {
  return { _class: survey.class.RadioButtonsOption, label: survey.string.Option }
}

/**
 * @public
 */
@Model(survey.class.RadioButtons, survey.class.QuestionData)
@UX(survey.string.RadioButtons, survey.icon.RadioButtons)
export class TRadioButtons extends TQuestionData implements RadioButtons {
  @Prop(TypeString(), survey.string.QuestionText, { defaultValue: '' })
    text: string = ''

  @Prop(ArrOf(TypeRadioButtonsOption()), survey.string.Options, { defaultValue: [] })
    options: RadioButtonsOption[] = []
}

/**
 * @public
 */
export function TypeCheckboxesOption (): Type<CheckboxesOption> {
  return { _class: survey.class.CheckboxesOption, label: survey.string.Option }
}

/**
 * @public
 */
@Model(survey.class.Checkboxes, survey.class.QuestionData)
@UX(survey.string.Checkboxes, survey.icon.Checkboxes)
export class TCheckboxes extends TQuestionData implements Checkboxes {
  @Prop(TypeString(), survey.string.QuestionText, { defaultValue: '' })
    text: string = ''

  @Prop(ArrOf(TypeCheckboxesOption()), survey.string.Options, { defaultValue: [] })
    options: RadioButtonsOption[] = []
}

/**
 * @public
 */
@Model(survey.class.Info, survey.class.QuestionData)
export class TInfo extends TQuestionData implements Info {
  @Prop(TypeMarkup(), survey.string.QuestionText, { defaultValue: '' })
    text: string = ''
}

/**
 * @public
 */
@Mixin(survey.mixin.QuestionDataEditor, core.class.Class)
export class TQuestionDataEditor<Q extends QuestionData> extends TClass implements QuestionDataEditor<Q> {
  editor!: QuestionDataEditorComponent<Q>
}
