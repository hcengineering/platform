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

import { type Question, type Rank } from '@hcengineering/survey'
import { type AttachedData, type Class, fillDefaults, type Ref, type TxOperations } from '@hcengineering/core'
import { LexoRank } from 'lexorank'

export function questionInit<Q extends Question> (
  client: TxOperations,
  prevRank: Rank | null = null,
  nextRank: Rank | null = null,
  _class: Ref<Class<Q>>
): AttachedData<Q> & Pick<Q, '_class'> {
  const prevLexoRank = prevRank === null ? LexoRank.min() : LexoRank.parse(prevRank)
  const nextLexoRank = nextRank === null ? LexoRank.max() : LexoRank.parse(nextRank)
  const rank = prevLexoRank.between(nextLexoRank).toString()

  const hierarchy = client.getHierarchy()
  const question: AttachedData<Question> & Pick<Question, '_class'> = {
    _class,
    title: '',
    rank,
    attachments: 0
  }
  // TODO: This code relies on convention that all question model classes declare
  //  default values on their attributes, so that fillDefaults() will provide
  //  a valid object. Should we provide a better way to init questions?
  fillDefaults(hierarchy, question, _class)

  return question as AttachedData<Q> & Pick<Q, '_class'>
}
