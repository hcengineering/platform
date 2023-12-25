import { type MultipleChoiceQuestion, type QuestionTypeInitQuestionFunction, type Rank } from '@hcengineering/survey'
import { type AttachedData, type Hierarchy } from '@hcengineering/core'
import { LexoRank } from 'lexorank'
import survey from '../plugin'
import { type ThemeOptions } from '@hcengineering/theme'
import { translate } from '@hcengineering/platform'

export const multipleChoiceInitQuestion: QuestionTypeInitQuestionFunction<MultipleChoiceQuestion> = async (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy,
  prevRank: Rank | null,
  nextRank: Rank | null
): Promise<AttachedData<MultipleChoiceQuestion>> => {
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
