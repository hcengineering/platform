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

import { type MultipleChoiceQuestion, type QuestionTypeInitQuestionFunction, type Rank } from '@hcengineering/survey'
import { type DocData, type Hierarchy } from '@hcengineering/core'
import { LexoRank } from 'lexorank'
import survey from '../plugin'
import { type ThemeOptions } from '@hcengineering/theme'
import { translate } from '@hcengineering/platform'

export const MultipleChoiceInitQuestion: QuestionTypeInitQuestionFunction<MultipleChoiceQuestion> = async (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy,
  prevRank: Rank | null,
  nextRank: Rank | null
): Promise<DocData<MultipleChoiceQuestion>> => {
  const prevLexoRank = prevRank === null ? LexoRank.min() : LexoRank.parse(prevRank)
  const nextLexoRank = nextRank === null ? LexoRank.max() : LexoRank.parse(nextRank)
  const rank = prevLexoRank.between(nextLexoRank).toString()

  const label = await translate(survey.string.Option, {}, language)

  return {
    options: [
      {
        label
      }
    ],
    shuffle: false,
    title: '',
    rank,
    attachments: 0,
    assessment: null
  }
}
