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

import { IndexKind, type Domain, type Ref } from '@hcengineering/core'
import { ArrOf, Index, Model, Prop, TypeRecord, TypeRef, TypeString, UX } from '@hcengineering/model'
import core, { TAttachedDoc, TDoc } from '@hcengineering/model-core'
import { getEmbeddedLabel } from '@hcengineering/platform'
import { type Poll, type Question, type Survey } from '@hcengineering/survey'
import survey from './plugin'

export const DOMAIN_SURVEY = 'survey' as Domain
export const DOMAIN_POLL = 'survey-poll' as Domain

@Model(survey.class.Survey, core.class.Doc, DOMAIN_SURVEY)
@UX(survey.string.Survey, survey.icon.Survey, 'SURV', 'name', undefined, survey.string.Surveys)
export class TSurvey extends TDoc implements Survey {
  @Prop(TypeString(), survey.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeString(), survey.string.Prompt)
    prompt!: string

  @Prop(ArrOf(TypeRecord()), survey.string.Questions)
    questions?: Question[]
}

@Model(survey.class.Poll, core.class.Doc, DOMAIN_POLL)
@UX(survey.string.Poll, survey.icon.Poll, 'POLL', undefined, undefined, survey.string.Polls)
export class TPoll extends TAttachedDoc implements Poll {
  @Prop(TypeRef(survey.class.Survey), survey.string.Survey)
    survey!: Ref<Survey>

  @Prop(TypeString(), survey.string.Name)
    name!: string

  @Prop(TypeString(), survey.string.Prompt)
    prompt!: string

  @Prop(ArrOf(TypeRecord()), getEmbeddedLabel('Answers'))
    results?: { question: string, answer: string[] }[]
}
