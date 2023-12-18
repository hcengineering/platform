import { type Question, type QuestionData, type Rank } from '@hcengineering/survey'
import { type AttachedData, type Class, fillDefaults, type Ref } from '@hcengineering/core'
import { LexoRank } from 'lexorank'
import { getClient } from '@hcengineering/presentation'
import survey from '../plugin'

export function questionInit<Q extends QuestionData> (
  prevRank: Rank | null = null,
  nextRank: Rank | null = null,
  dataClassRef: Ref<Class<Q>>
): AttachedData<Question<Q>> {
  const data: QuestionData = {
    _class: dataClassRef
  }
  // TODO: This code relies on convention that all question model classes declare
  //  default values on their attributes, so that fillDefaults() will provide
  //  a valid object. Should we provide a better way to init questions?
  fillDefaults(getClient().getHierarchy(), data, dataClassRef)

  const prevLexoRank = prevRank === null ? LexoRank.min() : LexoRank.parse(prevRank)
  const nextLexoRank = nextRank === null ? LexoRank.max() : LexoRank.parse(nextRank)
  const rank = prevLexoRank.between(nextLexoRank).toString()

  const question: AttachedData<Question<Q>> = {
    rank,
    data: data as Q
  }
  fillDefaults(getClient().getHierarchy(), question, survey.class.Question)

  return question
}
