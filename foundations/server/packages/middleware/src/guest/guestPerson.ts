/**

Copyright © 2026 TraceX SAS.

Licensed under the PolyForm Shield License 1.0.0 (the "License");
you may not use this file except in compliance with the License. You may
obtain a copy of the License at https://polyformproject.org/licenses/shield/1.0.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

See the License for the specific language governing permissions and
limitations under the License.
*/

import core, {
  type Account,
  type AccountUuid,
  type Class,
  type Doc,
  type DocumentQuery,
  type FindResult,
  type MeasureContext,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type SearchResultDoc,
  type SessionData,
  type Tx,
  type TxCreateDoc,
  type TxCUD,
  isGuestRole,
  toFindResult,
  TxProcessor
} from '@hcengineering/core'
import contact, { type Person } from '@hcengineering/contact'
import {
  BaseMiddleware,
  type Middleware,
  type PipelineContext,
  type ServerFindOptions,
  type TxMiddlewareResult
} from '@hcengineering/server-core'
import { isPersonAttachedClass, isPersonClass, restrictField } from './guestPersonUtils'
import { GuestVisibilityCache, type VisibleSet } from './guestVisibilityCache'
import { watchStall } from '../stallWatch'

interface BroadcastPersonSubject {
  personRef: Ref<Person>
  personUuid?: string
}

/**
 * Limits which persons a guest can list.
 *
 * A guest can list only persons whose account is a member/owner of a non-system space the guest is a member of.
 * Direct and list queries use the same visibility restrictions. Lookups are not restricted, so names of authors,
 * assignees etc. referenced from visible documents still resolve.
 *
 * Non-guest sessions pass through with a single role check.
 */
export class GuestPersonMiddleware extends BaseMiddleware implements Middleware {
  private readonly cache: GuestVisibilityCache

  private constructor (context: PipelineContext, next?: Middleware) {
    super(context, next)
    this.cache = new GuestVisibilityCache(
      context.hierarchy,
      async (ctx, _class, query, options) => (await this.next?.findAll(ctx, _class, query, options)) ?? []
    )
  }

  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined
  ): Promise<GuestPersonMiddleware> {
    return new GuestPersonMiddleware(context, next)
  }

  private async visible (ctx: MeasureContext<SessionData>, account: AccountUuid): Promise<VisibleSet> {
    return await watchStall(
      'guest-visibility.load',
      () => ({ workspace: this.context.workspace.uuid, account }),
      this.cache.getVisible(ctx, account)
    )
  }

  // ─── Find ───────────────────────────────────────────────────────────────────

  override async findAll<T extends Doc>(
    ctx: MeasureContext<SessionData>,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: ServerFindOptions<T>
  ): Promise<FindResult<T>> {
    // contextData is unset for internal calls (e.g. SpaceSecurityMiddleware init).
    const account = ctx.contextData?.account
    if (account === undefined || !isGuestRole(account.role)) {
      return await this.provideFindAll(ctx, _class, query, options)
    }
    if (isPersonClass(this.context.hierarchy, _class)) {
      return await this.findPersons(ctx, account, _class, query, options)
    }
    if (isPersonAttachedClass(this.context.hierarchy, _class)) {
      return await this.findPersonAttached(ctx, account, _class, query, options)
    }
    if (_class === (contact.class.Contact as Ref<Class<Doc>>)) {
      return await this.findContacts(ctx, account, _class, query, options)
    }
    return await this.provideFindAll(ctx, _class, query, options)
  }

  private async findPersons<T extends Doc>(
    ctx: MeasureContext<SessionData>,
    account: Account,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: ServerFindOptions<T>
  ): Promise<FindResult<T>> {
    const q = query as Record<string, unknown>
    const { accounts } = await this.visible(ctx, account.uuid)
    const newQuery = { ...q, personUuid: restrictField(q.personUuid, accounts) } as unknown as DocumentQuery<T>
    return await this.provideFindAll(ctx, _class, newQuery, options)
  }

  private async findPersonAttached<T extends Doc>(
    ctx: MeasureContext<SessionData>,
    account: Account,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: ServerFindOptions<T>
  ): Promise<FindResult<T>> {
    const q = query as Record<string, unknown>
    // Channels of non-person contacts (e.g. organizations) are not restricted.
    const attachedToClass = q.attachedToClass
    if (
      typeof attachedToClass === 'string' &&
      !isPersonClass(this.context.hierarchy, attachedToClass as Ref<Class<Doc>>)
    ) {
      return await this.provideFindAll(ctx, _class, query, options)
    }
    const { personRefs: refs } = await this.visible(ctx, account.uuid)
    const newQuery = { ...q, attachedTo: restrictField(q.attachedTo, refs) } as unknown as DocumentQuery<T>
    return await this.provideFindAll(ctx, _class, newQuery, options)
  }

  private async findContacts<T extends Doc>(
    ctx: MeasureContext<SessionData>,
    account: Account,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: ServerFindOptions<T>
  ): Promise<FindResult<T>> {
    const { accounts } = await this.visible(ctx, account.uuid)
    const requestedLimit = options?.limit
    let fetchLimit = requestedLimit
    let result = await this.provideFindAll(ctx, _class, query, options)
    let docs = this.filterContacts(result, accounts)

    while (
      this.shouldRefill(result.length, docs.length, fetchLimit, requestedLimit, result.total, options?.total === true)
    ) {
      const nextLimit = getNextLimit(fetchLimit, result.total)
      if (nextLimit === undefined) break
      fetchLimit = nextLimit
      result = await this.provideFindAll(ctx, _class, query, { ...options, limit: fetchLimit })
      docs = this.filterContacts(result, accounts)
    }

    const visibleDocs = requestedLimit !== undefined ? docs.slice(0, requestedLimit) : docs
    return toFindResult(visibleDocs, options?.total === true ? docs.length : -1, result.lookupMap)
  }

  private filterContacts<T extends Doc>(docs: T[], accounts: ReadonlySet<string>): T[] {
    return docs.filter((doc) => {
      if (!isPersonClass(this.context.hierarchy, doc._class)) return true
      const personUuid = (doc as unknown as Person).personUuid
      return personUuid !== undefined && accounts.has(personUuid)
    })
  }

  override async searchFulltext (
    ctx: MeasureContext<SessionData>,
    query: SearchQuery,
    options: SearchOptions
  ): Promise<SearchResult> {
    const account = ctx.contextData?.account
    if (account === undefined || !isGuestRole(account.role)) {
      return await this.provideSearchFulltext(ctx, query, options)
    }

    const visible = await this.visible(ctx, account.uuid)
    const requestedLimit = options.limit
    let fetchLimit = requestedLimit
    let result = await this.searchWithPersons(ctx, query, options)
    let docs = await this.filterSearchDocs(ctx, result.docs, visible)

    while (this.shouldRefill(result.docs.length, docs.length, fetchLimit, requestedLimit, result.total, false)) {
      const nextLimit = getNextLimit(fetchLimit, result.total)
      if (nextLimit === undefined) break
      fetchLimit = nextLimit
      result = await this.searchWithPersons(ctx, query, { ...options, limit: fetchLimit })
      docs = await this.filterSearchDocs(ctx, result.docs, visible)
    }

    const exhausted = result.total !== undefined && result.docs.length >= result.total
    return {
      docs: requestedLimit !== undefined ? docs.slice(0, requestedLimit) : docs,
      total: exhausted ? docs.length : undefined
    }
  }

  /**
   * SpaceSecurityMiddleware drops system spaces from guest searches, and every Person lives in the
   * `contact.space.Contacts` system space, so a guest would never find anybody. Person classes are searched
   * with that space added; the results are then limited to visible persons by `filterSearchDocs`.
   * Other classes and other system spaces stay closed.
   */
  private async searchWithPersons (
    ctx: MeasureContext<SessionData>,
    query: SearchQuery,
    options: SearchOptions
  ): Promise<SearchResult> {
    // Clients always search per category with explicit classes (see presentation `searchFor`).
    const personClasses = (query.classes ?? []).filter((it) => isPersonClass(this.context.hierarchy, it))
    if (personClasses.length === 0 || query.spaces === undefined) {
      return await this.provideSearchFulltext(ctx, query, options)
    }

    const personQuery: SearchQuery = {
      ...query,
      classes: personClasses,
      spaces: [...query.spaces, contact.space.Contacts]
    }

    // Persons only (e.g. the Employee category of mentions/spotlight): a single search is enough.
    if (personClasses.length === query.classes?.length) {
      return await this.provideSearchFulltext(ctx, personQuery, options)
    }

    const [main, persons] = await Promise.all([
      this.provideSearchFulltext(ctx, query, options),
      this.provideSearchFulltext(ctx, personQuery, options)
    ])
    const seen = new Set(main.docs.map((it) => it.id))
    const docs = [...main.docs, ...persons.docs.filter((it) => !seen.has(it.id))].sort(
      (a, b) => (b.score ?? 0) - (a.score ?? 0)
    )
    const total = main.total !== undefined && persons.total !== undefined ? main.total + persons.total : undefined
    return { docs: options.limit !== undefined ? docs.slice(0, options.limit) : docs, total }
  }

  private async filterSearchDocs (
    ctx: MeasureContext<SessionData>,
    docs: SearchResultDoc[],
    visible: VisibleSet
  ): Promise<SearchResultDoc[]> {
    const personIds = docs.filter((it) => isPersonClass(this.context.hierarchy, it.doc._class)).map((it) => it.doc._id)
    const persons =
      personIds.length > 0
        ? (((await this.next?.findAll(
            ctx,
            contact.class.Person,
            { _id: { $in: personIds as Ref<Person>[] } },
            { projection: { _id: 1, personUuid: 1 } }
          )) ?? []) as Person[])
        : []
    const allowed = new Set(
      persons.filter((it) => it.personUuid !== undefined && visible.accounts.has(it.personUuid)).map((it) => it._id)
    )
    return docs.filter((it) => {
      if (isPersonClass(this.context.hierarchy, it.doc._class)) return allowed.has(it.doc._id as Ref<Person>)
      if (!isPersonAttachedClass(this.context.hierarchy, it.doc._class)) return true
      if (it.doc.attachedToClass !== undefined && !isPersonClass(this.context.hierarchy, it.doc.attachedToClass)) {
        return true
      }
      return it.doc.attachedTo !== undefined && visible.personRefs.has(it.doc.attachedTo as Ref<Person>)
    })
  }

  private shouldRefill (
    loaded: number,
    visible: number,
    fetchLimit: number | undefined,
    requestedLimit: number | undefined,
    total: number | undefined,
    needsTotal: boolean
  ): boolean {
    if (fetchLimit === undefined || loaded < fetchLimit) return false
    if (needsTotal) return total === undefined || total < 0 || loaded < total
    return requestedLimit !== undefined && visible < requestedLimit && (total === undefined || loaded < total)
  }

  override async tx (ctx: MeasureContext<SessionData>, txes: Tx[]): Promise<TxMiddlewareResult> {
    const result = await this.provideTx(ctx, txes)
    for (const tx of txes) this.cache.handleTx(tx)
    return result
  }

  // ─── Broadcast ──────────────────────────────────────────────────────────────

  override async handleBroadcast (ctx: MeasureContext<SessionData>): Promise<void> {
    // Broadcast invalidation covers derived txes and txes committed by other sessions.
    for (const tx of ctx.contextData.broadcast.txes) this.cache.handleTx(tx)

    ctx.contextData.broadcast.targets.guestPerson = async (tx) => await this.getBroadcastExclude(ctx, tx)

    await this.next?.handleBroadcast(ctx)
  }

  private collectGuests (ctx: MeasureContext<SessionData>): Set<AccountUuid> {
    const guests = new Set<AccountUuid>()
    for (const val of ctx.contextData.socialStringsToUsers?.values() ?? []) {
      if (isGuestRole(val.role)) guests.add(val.accontUuid)
    }
    return guests
  }

  /**
   * Person docs live in a system space and are broadcast to everyone.
   * Exclude guests that are not allowed to see the affected person, so their live queries don't pick it up.
   */
  private async getBroadcastExclude (
    ctx: MeasureContext<SessionData>,
    tx: Tx
  ): Promise<{ exclude: AccountUuid[] } | undefined> {
    const subject = this.getBroadcastPersonSubject(tx)
    if (subject === undefined) return undefined

    const guests = this.collectGuests(ctx)
    if (guests.size === 0) return undefined

    const personUuid = subject.personUuid ?? (await this.resolvePersonUuid(ctx, subject.personRef))
    return await this.getGuestExclusions(ctx, guests, personUuid)
  }

  private getBroadcastPersonSubject (tx: Tx): BroadcastPersonSubject | undefined {
    if (!TxProcessor.isExtendsCUD(tx._class)) return undefined
    const cud = tx as TxCUD<Doc>

    if (isPersonClass(this.context.hierarchy, cud.objectClass)) {
      return {
        personRef: cud.objectId as Ref<Person>,
        personUuid:
          cud._class === core.class.TxCreateDoc ? (cud as TxCreateDoc<Person>).attributes.personUuid : undefined
      }
    }

    if (
      isPersonAttachedClass(this.context.hierarchy, cud.objectClass) &&
      isPersonClass(this.context.hierarchy, cud.attachedToClass)
    ) {
      const personRef = cud.attachedTo as Ref<Person> | undefined
      return personRef !== undefined ? { personRef } : undefined
    }
    return undefined
  }

  private async getGuestExclusions (
    ctx: MeasureContext<SessionData>,
    guests: Set<AccountUuid>,
    personUuid: string | undefined
  ): Promise<{ exclude: AccountUuid[] } | undefined> {
    const others = Array.from(guests).filter((guest) => guest !== personUuid)
    let exclude: AccountUuid[]
    if (personUuid === undefined) {
      // Persons without an account are never listed for guests.
      exclude = others
    } else {
      // Load visibility of all guests in parallel: on a cold cache each load is a few DB queries.
      const hidden = await Promise.all(
        others.map(async (guest) => !(await this.visible(ctx, guest)).accounts.has(personUuid))
      )
      exclude = others.filter((_, i) => hidden[i])
    }
    return exclude.length > 0 ? { exclude } : undefined
  }

  private async resolvePersonUuid (
    ctx: MeasureContext<SessionData>,
    personRef: Ref<Person>
  ): Promise<string | undefined> {
    const removed = ctx.contextData.removedMap?.get(personRef) as Person | undefined
    if (removed !== undefined) return removed.personUuid
    const persons = ((await this.next?.findAll(
      ctx,
      contact.class.Person,
      { _id: personRef },
      { limit: 1, projection: { _id: 1, personUuid: 1 } }
    )) ?? []) as Person[]
    return persons[0]?.personUuid
  }
}

function getNextLimit (current: number | undefined, total: number | undefined): number | undefined {
  if (current === undefined || current >= Number.MAX_SAFE_INTEGER) return undefined
  const expanded = Math.min(Number.MAX_SAFE_INTEGER, Math.max(current + 1, current * 2))
  const next = total !== undefined && total >= 0 ? Math.min(expanded, total) : expanded
  return next > current ? next : undefined
}
