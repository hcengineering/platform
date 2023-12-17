import { type Question, type Rank } from '@hcengineering/survey'
import { type AttachedData, type Class, type DocData, fillDefaults, type Ref } from '@hcengineering/core'
import { LexoRank } from 'lexorank'
import { getClient } from '@hcengineering/presentation'

export function questionInit<Q extends Question> (
  classRef: Ref<Class<Q>>,
  prevRank: Rank | null = null,
  nextRank: Rank | null = null
): AttachedData<Q> {
  const prevLexoRank = prevRank === null ? LexoRank.min() : LexoRank.parse(prevRank)
  const nextLexoRank = nextRank === null ? LexoRank.max() : LexoRank.parse(nextRank)
  const rank = prevLexoRank.between(nextLexoRank).toString()
  // TODO: Ugly typings hack
  const object = { rank } as unknown as DocData<Q>
  // TODO: This code relies on convention that all question model classes declare
  //  default values on their attributes, so that fillDefaults() will provide
  //  a valid object. Should we provide a better way to init questions?
  fillDefaults<Q>(getClient().getHierarchy(), object, classRef)
  return object as AttachedData<Q>
}
