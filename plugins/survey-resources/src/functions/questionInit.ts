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

import { type Question, type QuestionData, type Rank } from '@hcengineering/survey'
import { type AttachedData, type Class, fillDefaults, type Ref, type TxOperations } from '@hcengineering/core'
import { LexoRank } from 'lexorank'
import survey from '../plugin'

export function questionInit<Q extends QuestionData> (
  client: TxOperations,
  prevRank: Rank | null = null,
  nextRank: Rank | null = null,
  dataClassRef: Ref<Class<Q>>
): AttachedData<Question<Q>> {
  const hierarchy = client.getHierarchy()
  const data: QuestionData = {
    _class: dataClassRef
  }
  // TODO: This code relies on convention that all question model classes declare
  //  default values on their attributes, so that fillDefaults() will provide
  //  a valid object. Should we provide a better way to init questions?
  fillDefaults(hierarchy, data, dataClassRef)

  const prevLexoRank = prevRank === null ? LexoRank.min() : LexoRank.parse(prevRank)
  const nextLexoRank = nextRank === null ? LexoRank.max() : LexoRank.parse(nextRank)
  const rank = prevLexoRank.between(nextLexoRank).toString()

  const question: AttachedData<Question<Q>> = {
    rank,
    data: data as Q
  }
  fillDefaults(hierarchy, question, survey.class.Question)

  return question
}
