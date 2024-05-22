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
import core, {
  Account,
  AccountRole,
  AttachedDoc,
  Class,
  Doc,
  DocumentQuery,
  Domain,
  FindOptions,
  FindResult,
  LookupData,
  MeasureContext,
  ObjQueryType,
  Position,
  PullArray,
  Ref,
  SearchOptions,
  SearchQuery,
  SearchResult,
  ServerStorage,
  Space,
  Tx,
  TxCUD,
  TxCreateDoc,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc,
  TxWorkspaceEvent,
  WorkspaceEvent,
  generateId,
  systemAccountEmail
} from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import { Middleware, SessionContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { BaseMiddleware } from './base'
import { getUser, isOwner, isSystem, mergeTargets } from './utils'

type SpaceWithMembers = Pick<Space, '_id' | 'members' | 'private' | '_class'>

/**
 * @public
 */
export class SpaceSecurityMiddleware extends BaseMiddleware implements Middleware {
  private allowedSpaces: Record<Ref<Account>, Ref<Space>[]> = {}
  private readonly spacesMap = new Map<Ref<Space>, SpaceWithMembers>()
  private readonly privateSpaces = new Set<Ref<Space>>()
  private readonly _domainSpaces = new Map<string, Set<Ref<Space>> | Promise<Set<Ref<Space>>>>()
  private readonly publicSpaces = new Set<Ref<Space>>()
  private readonly systemSpaces = new Set<Ref<Space>>()

  private spaceMeasureCtx!: MeasureContext

  private spaceSecurityInit: Promise<void> | undefined

  private readonly mainSpaces = [
    core.space.Configuration,
    core.space.DerivedTx,
    core.space.Model,
    core.space.Space,
    core.space.Tx
  ]

  private constructor (storage: ServerStorage, next?: Middleware) {
    super(storage, next)
  }

  static async create (
    ctx: MeasureContext,
    storage: ServerStorage,
    next?: Middleware
  ): Promise<SpaceSecurityMiddleware> {
    const res = new SpaceSecurityMiddleware(storage, next)
    res.spaceMeasureCtx = ctx.newChild('space chain', {})
    res.spaceSecurityInit = res.init(res.spaceMeasureCtx)
    return res
  }

  private addMemberSpace (member: Ref<Account>, space: Ref<Space>): void {
    const arr = this.allowedSpaces[member] ?? []
    arr.push(space)
    this.allowedSpaces[member] = arr
  }

  private addSpace (space: SpaceWithMembers): void {
    this.spacesMap.set(space._id, space)
    if (space.private) {
      this.privateSpaces.add(space._id)
    } else {
      this.publicSpaces.add(space._id)
    }
    for (const member of space.members) {
      this.addMemberSpace(member, space._id)
    }
  }

  private async init (ctx: MeasureContext): Promise<void> {
    const spaces: SpaceWithMembers[] = await this.storage.findAll(
      ctx,
      core.class.Space,
      {},
      {
        projection: {
          private: 1,
          _class: 1,
          _id: 1,
          members: 1
        }
      }
    )
    this.spacesMap.clear()
    this.publicSpaces.clear()
    this.systemSpaces.clear()
    for (const space of spaces) {
      if (space._class === core.class.SystemSpace) {
        this.systemSpaces.add(space._id)
      } else {
        this.addSpace(space)
      }
    }
  }

  async waitInit (): Promise<void> {
    if (this.spaceSecurityInit !== undefined) {
      await this.spaceSecurityInit
      this.spaceSecurityInit = undefined
    }
  }

  private removeMemberSpace (member: Ref<Account>, space: Ref<Space>): void {
    const arr = this.allowedSpaces[member]
    if (arr !== undefined) {
      const index = arr.findIndex((p) => p === space)
      if (index !== -1) {
        arr.splice(index, 1)
        this.allowedSpaces[member] = arr
      }
    }
  }

  private removeSpace (_id: Ref<Space>): void {
    const space = this.spacesMap.get(_id)
    if (space !== undefined) {
      for (const member of space.members) {
        this.removeMemberSpace(member, space._id)
      }
    }
    this.spacesMap.delete(_id)
    this.privateSpaces.delete(_id)
    this.publicSpaces.delete(_id)
  }

  private handleCreate (tx: TxCUD<Space>): void {
    const createTx = tx as TxCreateDoc<Space>
    if (!this.storage.hierarchy.isDerived(createTx.objectClass, core.class.Space)) return
    if (createTx.objectClass === core.class.SystemSpace) {
      this.systemSpaces.add(createTx.objectId)
    } else {
      const res = TxProcessor.createDoc2Doc<Space>(createTx)
      this.addSpace(res)
    }
  }

  private async pushMembersHandle (
    ctx: SessionContext,
    addedMembers: Ref<Account> | Position<Ref<Account>>,
    space: Ref<Space>
  ): Promise<void> {
    if (typeof addedMembers === 'object') {
      for (const member of addedMembers.$each) {
        this.addMemberSpace(member, space)
      }
      await this.brodcastEvent(ctx, addedMembers.$each, space)
    } else {
      this.addMemberSpace(addedMembers, space)
      await this.brodcastEvent(ctx, [addedMembers], space)
    }
  }

  private async pullMembersHandle (
    ctx: SessionContext,
    removedMembers: Partial<Ref<Account>> | PullArray<Ref<Account>>,
    space: Ref<Space>
  ): Promise<void> {
    if (typeof removedMembers === 'object') {
      const { $in } = removedMembers as PullArray<Ref<Account>>
      if ($in !== undefined) {
        for (const member of $in) {
          this.removeMemberSpace(member, space)
        }
        await this.brodcastEvent(ctx, $in, space)
      }
    } else {
      this.removeMemberSpace(removedMembers, space)
      await this.brodcastEvent(ctx, [removedMembers], space)
    }
  }

  private async syncMembers (ctx: SessionContext, members: Ref<Account>[], space: SpaceWithMembers): Promise<void> {
    const oldMembers = new Set(space.members)
    const newMembers = new Set(members)
    const changed: Ref<Account>[] = []
    for (const old of oldMembers) {
      if (!newMembers.has(old)) {
        this.removeMemberSpace(old, space._id)
        changed.push(old)
      }
    }
    for (const newMem of newMembers) {
      if (!oldMembers.has(newMem)) {
        this.addMemberSpace(newMem, space._id)
        changed.push(newMem)
      }
    }
    if (changed.length > 0) {
      await this.brodcastEvent(ctx, changed, space._id)
    }
  }

  private async brodcastEvent (ctx: SessionContext, users: Ref<Account>[], space?: Ref<Space>): Promise<void> {
    const targets = await this.getTargets(users)
    const tx: TxWorkspaceEvent = {
      _class: core.class.TxWorkspaceEvent,
      _id: generateId(),
      event: WorkspaceEvent.SecurityChange,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      objectSpace: space ?? core.space.DerivedTx,
      space: core.space.DerivedTx,
      params: null
    }
    ctx.derived.push({
      derived: [tx],
      target: targets
    })
  }

  private async broadcastNonMembers (ctx: SessionContext, space: SpaceWithMembers): Promise<void> {
    const users = await this.storage.modelDb.findAll(core.class.Account, { _id: { $nin: space?.members } })
    await this.brodcastEvent(
      ctx,
      users.map((p) => p._id),
      space._id
    )
  }

  private async handleUpdate (ctx: SessionContext, tx: TxCUD<Space>): Promise<void> {
    await this.waitInit()

    const updateDoc = tx as TxUpdateDoc<Space>
    if (!this.storage.hierarchy.isDerived(updateDoc.objectClass, core.class.Space)) return

    const space = this.spacesMap.get(updateDoc.objectId)
    if (space !== undefined) {
      if (updateDoc.operations.private !== undefined) {
        if (updateDoc.operations.private) {
          this.privateSpaces.add(updateDoc.objectId)
          this.publicSpaces.delete(updateDoc.objectId)
          await this.broadcastNonMembers(ctx, space)
        } else if (!updateDoc.operations.private) {
          this.privateSpaces.delete(updateDoc.objectId)
          this.publicSpaces.add(updateDoc.objectId)
          await this.broadcastNonMembers(ctx, space)
        }
      }

      if (updateDoc.operations.members !== undefined) {
        await this.syncMembers(ctx, updateDoc.operations.members, space)
      }
      if (updateDoc.operations.$push?.members !== undefined) {
        await this.pushMembersHandle(ctx, updateDoc.operations.$push.members, space._id)
      }

      if (updateDoc.operations.$pull?.members !== undefined) {
        await this.pullMembersHandle(ctx, updateDoc.operations.$pull.members, space._id)
      }
      const updatedSpace = TxProcessor.updateDoc2Doc(space as any, updateDoc)
      this.spacesMap.set(updateDoc.objectId, updatedSpace)
    }
  }

  private handleRemove (tx: TxCUD<Space>): void {
    const removeTx = tx as TxRemoveDoc<Space>
    if (!this.storage.hierarchy.isDerived(removeTx.objectClass, core.class.Space)) return
    if (removeTx._class !== core.class.TxCreateDoc) return
    this.removeSpace(tx.objectId)
  }

  private async handleTx (ctx: SessionContext, tx: TxCUD<Space>): Promise<void> {
    await this.waitInit()
    if (tx._class === core.class.TxCreateDoc) {
      this.handleCreate(tx)
    } else if (tx._class === core.class.TxUpdateDoc) {
      await this.handleUpdate(ctx, tx)
    } else if (tx._class === core.class.TxRemoveDoc) {
      this.handleRemove(tx)
    }
  }

  async getTargets (accounts: Ref<Account>[]): Promise<string[]> {
    const users = await this.storage.modelDb.findAll(core.class.Account, { _id: { $in: accounts } })
    const res = users.map((p) => p.email)
    res.push(systemAccountEmail)
    return res
  }

  private async getTxTargets (ctx: SessionContext, tx: Tx): Promise<string[] | undefined> {
    const h = this.storage.hierarchy
    let targets: string[] | undefined

    if (h.isDerived(tx._class, core.class.TxCUD)) {
      const account = await getUser(this.storage, ctx)
      if (tx.objectSpace === (account._id as string)) {
        targets = [account.email, systemAccountEmail]
      } else if ([...this.systemSpaces, ...this.mainSpaces].includes(tx.objectSpace)) {
        return
      } else {
        const cudTx = tx as TxCUD<Doc>
        const isSpace = h.isDerived(cudTx.objectClass, core.class.Space)

        if (isSpace) {
          return undefined
        }

        const space = this.spacesMap.get(tx.objectSpace)

        if (space !== undefined) {
          targets = await this.getTargets(space.members)
          if (!isOwner(account, ctx)) {
            const allowed = this.getAllAllowedSpaces(account, true)
            if (allowed === undefined || !allowed.includes(tx.objectSpace)) {
              throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
            }
          } else if (!targets.includes(account.email)) {
            targets.push(account.email)
          }
        }
      }
    }

    return targets
  }

  private async processTxSpaceDomain (tx: TxCUD<Doc>): Promise<void> {
    const actualTx = TxProcessor.extractTx(tx)
    if (actualTx._class === core.class.TxCreateDoc) {
      const ctx = actualTx as TxCreateDoc<Doc>
      const doc = TxProcessor.createDoc2Doc(ctx)
      const domain = this.storage.hierarchy.getDomain(ctx.objectClass)
      const key = this.getKey(domain)
      const space = (doc as any)[key]
      if (space === undefined) return
      ;(await this.getDomainSpaces(domain)).add(space)
    } else if (actualTx._class === core.class.TxUpdateDoc) {
      const updTx = actualTx as TxUpdateDoc<Doc>
      const domain = this.storage.hierarchy.getDomain(updTx.objectClass)
      const key = this.getKey(domain)
      const space = (updTx.operations as any)[key]
      if (space !== undefined) {
        ;(await this.getDomainSpaces(domain)).add(space)
      }
    }
  }

  private async processTx (ctx: SessionContext, tx: Tx): Promise<void> {
    const h = this.storage.hierarchy
    if (h.isDerived(tx._class, core.class.TxCUD)) {
      const cudTx = tx as TxCUD<Doc>
      const isSpace = h.isDerived(cudTx.objectClass, core.class.Space)
      if (isSpace) {
        const account = await getUser(this.storage, ctx)
        if (account.role === AccountRole.Guest) {
          throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
        }
        await this.handleTx(ctx, cudTx as TxCUD<Space>)
      }
      await this.processTxSpaceDomain(tx as TxCUD<Doc>)
      if (h.isDerived(cudTx.objectClass, core.class.Account) && cudTx._class === core.class.TxUpdateDoc) {
        const cud = cudTx as TxUpdateDoc<Account>
        if (cud.operations.role !== undefined) {
          await this.brodcastEvent(ctx, [cud.objectId])
        }
      }
    }
  }

  async tx (ctx: SessionContext, tx: Tx): Promise<TxMiddlewareResult> {
    await this.waitInit()
    const account = await getUser(this.storage, ctx)
    if (account.role === AccountRole.DocGuest) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
    await this.processTx(ctx, tx)
    const targets = await this.getTxTargets(ctx, tx)
    const res = await this.provideTx(ctx, tx)
    for (const txd of ctx.derived) {
      for (const tx of txd.derived) {
        await this.processTx(ctx, tx)
      }
    }
    ctx.derived.forEach((it) => {
      it.target = mergeTargets(targets, it.target)
    })

    await this.waitInit()
    for (const tt of ctx.derived) {
      for (const t of tt.derived) {
        if (this.storage.hierarchy.isDerived(t._class, core.class.TxCUD)) {
          await this.processTxSpaceDomain(t as TxCUD<Doc>)
        }
      }
    }

    return res
  }

  private getAllAllowedSpaces (account: Account, isData: boolean): Ref<Space>[] {
    const userSpaces = this.allowedSpaces[account._id] ?? []
    const res = [...userSpaces, account._id as string as Ref<Space>, ...this.systemSpaces, ...this.mainSpaces]
    return isData ? res : [...res, ...this.publicSpaces]
  }

  async loadDomainSpaces (ctx: MeasureContext, domain: Domain): Promise<Set<Ref<Space>>> {
    const map = new Set<Ref<Space>>()
    const field = this.getKey(domain)
    while (true) {
      const spaces = await this.storage.findAll(
        ctx,
        core.class.Doc,
        {
          [field]: { $nin: Array.from(map.values()) }
        },
        {
          projection: { [field]: 1 },
          limit: 1000,
          domain
        }
      )
      if (spaces.length === 0) {
        break
      }
      spaces.forEach((p) => map.add((p as any)[field] as Ref<Space>))
    }
    return map
  }

  async getDomainSpaces (domain: Domain): Promise<Set<Ref<Space>>> {
    let domainSpaces = this._domainSpaces.get(domain)
    if (domainSpaces === undefined) {
      const p = this.loadDomainSpaces(this.spaceMeasureCtx, domain)
      this._domainSpaces.set(domain, p)
      domainSpaces = await p
      this._domainSpaces.set(domain, domainSpaces)
    }
    return domainSpaces instanceof Promise ? await domainSpaces : domainSpaces
  }

  private async filterByDomain (domain: Domain, spaces: Ref<Space>[]): Promise<Ref<Space>[]> {
    const domainSpaces = await this.getDomainSpaces(domain)
    return spaces.filter((p) => domainSpaces.has(p))
  }

  private async mergeQuery<T extends Doc>(
    account: Account,
    query: ObjQueryType<T['space']>,
    domain: Domain,
    isSpace: boolean
  ): Promise<ObjQueryType<T['space']>> {
    const spaces = await this.filterByDomain(domain, this.getAllAllowedSpaces(account, !isSpace))
    if (query == null) {
      return { $in: spaces }
    }
    if (typeof query === 'string') {
      if (!spaces.includes(query)) {
        return { $in: [] }
      }
    } else if (query.$in != null) {
      query.$in = query.$in.filter((p) => spaces.includes(p))
    } else {
      query.$in = spaces
    }
    return query
  }

  private getKey (domain: string): string {
    return domain === 'tx' ? 'objectSpace' : domain === 'space' ? '_id' : 'space'
  }

  override async findAll<T extends Doc>(
    ctx: SessionContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    await this.waitInit()

    const domain = this.storage.hierarchy.getDomain(_class)
    const newQuery = query
    const account = await getUser(this.storage, ctx)
    const isSpace = this.storage.hierarchy.isDerived(_class, core.class.Space)
    const field = this.getKey(domain)

    if (!isSystem(account) && account.role !== AccountRole.DocGuest) {
      if (!isOwner(account, ctx) || !isSpace) {
        if (query[field] !== undefined) {
          ;(newQuery as any)[field] = await this.mergeQuery(account, query[field], domain, isSpace)
        } else {
          const spaces = await this.filterByDomain(domain, this.getAllAllowedSpaces(account, !isSpace))
          ;(newQuery as any)[field] = { $in: spaces }
        }
      }
    }
    const findResult = await this.provideFindAll(ctx, _class, newQuery, options)
    if (!isOwner(account, ctx) && account.role !== AccountRole.DocGuest) {
      if (options?.lookup !== undefined) {
        for (const object of findResult) {
          if (object.$lookup !== undefined) {
            await this.filterLookup(ctx, object.$lookup)
          }
        }
      }
    }
    return findResult
  }

  override async searchFulltext (
    ctx: SessionContext,
    query: SearchQuery,
    options: SearchOptions
  ): Promise<SearchResult> {
    await this.waitInit()
    const newQuery = { ...query }
    const account = await getUser(this.storage, ctx)
    if (!isSystem(account)) {
      const allSpaces = this.getAllAllowedSpaces(account, true)
      if (query.classes !== undefined) {
        const res = new Set<Ref<Space>>()
        const passedDomains = new Set<string>()
        for (const _class of query.classes) {
          const domain = this.storage.hierarchy.getDomain(_class)
          if (passedDomains.has(domain)) {
            continue
          }
          passedDomains.add(domain)
          const spaces = await this.filterByDomain(domain, allSpaces)
          for (const space of spaces) {
            res.add(space)
          }
        }
        newQuery.spaces = [...res]
      } else {
        newQuery.spaces = allSpaces
      }
    }
    const result = await this.provideSearchFulltext(ctx, newQuery, options)
    return result
  }

  async isUnavailable (ctx: SessionContext, space: Ref<Space>): Promise<boolean> {
    const account = await getUser(this.storage, ctx)
    if (isSystem(account)) return false
    return !this.getAllAllowedSpaces(account, true).includes(space)
  }

  async filterLookup<T extends Doc>(ctx: SessionContext, lookup: LookupData<T>): Promise<void> {
    for (const key in lookup) {
      const val = lookup[key]
      if (Array.isArray(val)) {
        const arr: AttachedDoc[] = []
        for (const value of val) {
          if (!(await this.isUnavailable(ctx, value.space))) {
            arr.push(value)
          }
        }
        lookup[key] = arr as any
      } else if (val !== undefined) {
        if (await this.isUnavailable(ctx, val.space)) {
          lookup[key] = undefined
        }
      }
    }
  }
}
