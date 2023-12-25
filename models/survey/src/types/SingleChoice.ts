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

import { ArrOf, Model, Prop, TypeBoolean, UX } from '@hcengineering/model'
import core, { TType } from '@hcengineering/model-core'
import survey from '../plugin'
import { type Type } from '@hcengineering/core'
import {
  type QuestionOption,
  type SingleChoiceAnswerData,
  type SingleChoiceAssessmentData,
  type SingleChoiceQuestion
} from '@hcengineering/survey'
import { TQuestion, TypeQuestionOption } from './base'

/** @public */
@UX(survey.string.SingleChoice)
@Model(survey.class.TypeSingleChoiceAssessmentData, core.class.Type)
export class TTypeSingleChoiceAssessmentData extends TType {}

/** @public */
export function TypeSingleChoiceAssessmentData (): Type<SingleChoiceAssessmentData> {
  return { _class: survey.class.TypeSingleChoiceAssessmentData, label: survey.string.SingleChoice }
}

/** @public */
@Model(survey.class.SingleChoiceQuestion, survey.class.Question)
@UX(survey.string.SingleChoice, survey.icon.RadioButton)
export class TSingleChoiceQuestion
  extends TQuestion<SingleChoiceAnswerData, SingleChoiceAssessmentData>
  implements SingleChoiceQuestion {
  @Prop(ArrOf(TypeQuestionOption()), survey.string.Options, { defaultValue: [] })
    options: QuestionOption[] = []

  @Prop(TypeBoolean(), survey.string.Shuffle, { defaultValue: false })
    shuffle: boolean = false

  @Prop(TypeSingleChoiceAssessmentData(), survey.string.Assessment, { defaultValue: null })
  override assessment: SingleChoiceAssessmentData | null = null
}
