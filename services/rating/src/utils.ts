/* eslint-disable @typescript-eslint/unbound-method */
import core, {
  type Class,
  type Doc,
  type Domain,
  DOMAIN_COLLABORATOR,
  groupByArray,
  type Hierarchy,
  isClassIndexable,
  type ModelDb,
  type Ref,
  type Tx,
  type TxCUD,
  TxProcessor
} from '@hcengineering/core'
import { DOMAIN_PERSON_RATING, DOMAIN_RATING_REACTION, type PersonRating } from '@hcengineering/rating'

export function fulltextModelFilter (h: Hierarchy, model: Tx[]): Tx[] {
  const allowedClasess: Ref<Class<Doc>>[] = [
    core.class.Class,
    core.class.Attribute,
    core.class.Mixin,
    core.class.Type,
    core.class.Status,
    core.class.Permission,
    core.class.Space,
    core.class.Tx,
    core.class.FullTextSearchContext
  ]
  return model.filter(
    (it) =>
      TxProcessor.isExtendsCUD(it._class) &&
      allowedClasess.some((cl) => h.isDerived((it as TxCUD<Doc>).objectClass, cl))
  )
}

export function calculatePersonRating (person: PersonRating): number {
  let rating = 0
  rating += person.starsEarned * 0.3
  rating += person.reactionsEarned * 0.05

  rating += person.stars * 0.05 // Spend stars
  rating += person.reactions * 0.02 // Created reactions

  // Calculate how long I've stay in months and how long I've active

  const months = person.months.length + 1

  const totals = person.months
    .map((it) => ({ c: it[1], u: it[2], r: it[3] }))
    .reduce((a, b) => ({ c: a.c + b.c, u: a.u + b.u, r: a.r + b.r }), { c: 0, u: 0, r: 0 })

  rating += totals.c * 0.03
  rating += totals.u * 0.01
  rating += totals.r * 0.02

  rating += months * 0.05

  return rating
}

export function getRatingDomains (h: Hierarchy, modelDb: ModelDb): [Domain, Set<Ref<Class<Doc>>>][] {
  const allClasses = h.getDescendants(core.class.Doc)
  const contexts = new Map(modelDb.findAllSync(core.class.FullTextSearchContext, {}).map((it) => [it.toClass, it]))
  const allIndexed = allClasses.filter((it) => isClassIndexable(h, it, contexts))

  const byDomain = groupByArray(allIndexed, (it) => h.getDomain(it))

  // Delete few domains
  byDomain.delete(DOMAIN_COLLABORATOR)
  byDomain.delete(DOMAIN_RATING_REACTION)
  byDomain.delete(DOMAIN_PERSON_RATING)

  return Array.from(byDomain.entries()).map((it) => [it[0], new Set(it[1])])
}

export function getIgnoreDomains (h: Hierarchy, modelDb: ModelDb): [Domain, Set<Ref<Class<Doc>>>][] {
  const allClasses = h.getDescendants(core.class.Doc)
  const contexts = new Map(modelDb.findAllSync(core.class.FullTextSearchContext, {}).map((it) => [it.toClass, it]))
  const allIndexed = allClasses.filter((it) => !isClassIndexable(h, it, contexts))

  const byDomain = groupByArray(allIndexed, (it) => h.findDomain(it) ?? ('' as Domain))

  return Array.from(byDomain.entries()).map((it) => [it[0], new Set(it[1])])
}
