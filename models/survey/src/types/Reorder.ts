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
import survey from '../plugin'
import core, { TType } from '@hcengineering/model-core'
import type { Type } from '@hcengineering/core'
import type { QuestionOption, ReorderAnswerData, ReorderAssessmentData, ReorderQuestion } from '@hcengineering/survey'
import { TQuestion, TypeQuestionOption } from './base'

/** @public */
@UX(survey.string.Reorder)
@Model(survey.class.TypeReorderAssessmentData, core.class.Type)
export class TTypeReorderAssessmentData extends TType {}

/** @public */
export function TypeReorderAssessmentData (): Type<ReorderAssessmentData> {
  return { _class: survey.class.TypeReorderAssessmentData, label: survey.string.Reorder }
}

/** @public */
@Model(survey.class.ReorderQuestion, survey.class.Question)
@UX(survey.string.Reorder, survey.icon.Drag)
export class TReorderQuestion extends TQuestion<ReorderAnswerData, ReorderAssessmentData> implements ReorderQuestion {
  @Prop(ArrOf(TypeQuestionOption()), survey.string.Options, { defaultValue: [] })
    options: QuestionOption[] = []

  @Prop(TypeBoolean(), survey.string.Shuffle, { defaultValue: false })
    shuffle: boolean = false

  @Prop(TypeReorderAssessmentData(), survey.string.Assessment, { defaultValue: null })
  override assessment: ReorderAssessmentData | null = null
}
