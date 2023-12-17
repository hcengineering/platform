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
  AttachedDoc,
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  generateId,
  LookupData,
  MeasureContext,
  ObjQueryType,
  Position,
  PullArray,
  Ref,
  ServerStorage,
  Space,
  systemAccountEmail,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc,
  TxWorkspaceEvent,
  WorkspaceEvent,
  SearchResult,
  SearchQuery,
  SearchOptions
} from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import { BroadcastFunc, Middleware, SessionContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { BaseMiddleware } from './base'
import { getUser, isOwner, isSystem, mergeTargets } from './utils'

/**
 * @public
 */
export class SpaceSecurityMiddleware extends BaseMiddleware implements Middleware {
  private allowedSpaces: Record<Ref<Account>, Ref<Space>[]> = {}
  private privateSpaces: Record<Ref<Space>, Space | undefined> = {}
  private publicSpaces: Ref<Space>[] = []
  private readonly systemSpaces = [
    core.space.Configuration,
    core.space.DerivedTx,
    core.space.Model,
    core.space.Space,
    core.space.Tx
  ]

  private constructor (
    private readonly broadcast: BroadcastFunc,
    storage: ServerStorage,
    next?: Middleware
  ) {
    super(storage, next)
  }

  static async create (
    ctx: MeasureContext,
    broadcast: BroadcastFunc,
    storage: ServerStorage,
    next?: Middleware
  ): Promise<SpaceSecurityMiddleware> {
    const res = new SpaceSecurityMiddleware(broadcast, storage, next)
    await res.init(ctx)
    return res
  }

  private addMemberSpace (member: Ref<Account>, space: Ref<Space>): void {
    const arr = this.allowedSpaces[member] ?? []
    arr.push(space)
    this.allowedSpaces[member] = arr
  }

  private addSpace (space: Space): void {
    this.privateSpaces[space._id] = space
    for (const member of space.members) {
      this.addMemberSpace(member, space._id)
    }
  }

  private async init (ctx: MeasureContext): Promise<void> {
    // FIXME: The following line looks up for private spaces in DOMAIN_SPACE only.
    //  Thus, if you have a model class that represents private spaces,
    //  and try to store it in its own domain, e.g. `@Model(MyModel, Space, MY_DOMAIN)`,
    //  you won't be able to fetch instances of that class after the server restarts
    //  due to query rewrite logic (see {@link SpaceSecurityMiddleware#findAll()})
    const spaces = await this.storage.findAll(ctx, core.class.Space, { private: true })
    for (const space of spaces) {
      this.addSpace(space)
    }
    this.publicSpaces = (await this.storage.findAll(ctx, core.class.Space, { private: false })).map((p) => p._id)
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
    const space = this.privateSpaces[_id]
    if (space !== undefined) {
      for (const member of space.members) {
        this.removeMemberSpace(member, space._id)
      }
      this.privateSpaces[_id] = undefined
    }
  }

  private handleCreate (tx: TxCUD<Space>): void {
    const createTx = tx as TxCreateDoc<Space>
    if (!this.storage.hierarchy.isDerived(createTx.objectClass, core.class.Space)) return
    if (createTx.attributes.private) {
      const res = TxProcessor.buildDoc2Doc<Space>([createTx])
      if (res !== undefined) {
        this.addSpace(res)
      }
    } else {
      this.publicSpaces.push(createTx.objectId)
    }
  }

  private async pushMembersHandle (
    addedMembers: Ref<Account> | Position<Ref<Account>>,
    space: Ref<Space>
  ): Promise<void> {
    if (typeof addedMembers === 'object') {
      for (const member of addedMembers.$each) {
        this.addMemberSpace(member, space)
      }
      await this.brodcastEvent(addedMembers.$each)
    } else {
      this.addMemberSpace(addedMembers, space)
      await this.brodcastEvent([addedMembers])
    }
  }

  private async pullMembersHandle (
    removedMembers: Partial<Ref<Account>> | PullArray<Ref<Account>>,
    space: Ref<Space>
  ): Promise<void> {
    if (typeof removedMembers === 'object') {
      const { $in } = removedMembers as PullArray<Ref<Account>>
      if ($in !== undefined) {
        for (const member of $in) {
          this.removeMemberSpace(member, space)
        }
        await this.brodcastEvent($in)
      }
    } else {
      this.removeMemberSpace(removedMembers, space)
      await this.brodcastEvent([removedMembers])
    }
  }

  private async syncMembers (members: Ref<Account>[], space: Space): Promise<void> {
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
      await this.brodcastEvent(changed)
    }
  }

  private removePublicSpace (_id: Ref<Space>): void {
    const publicIndex = this.publicSpaces.findIndex((p) => p === _id)
    if (publicIndex !== -1) {
      this.publicSpaces.splice(publicIndex, 1)
    }
  }

  private async brodcastEvent (users: Ref<Account>[]): Promise<void> {
    const targets = await this.getTargets(users)
    const tx: TxWorkspaceEvent = {
      _class: core.class.TxWorkspaceEvent,
      _id: generateId(),
      event: WorkspaceEvent.SecurityChange,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      objectSpace: core.space.DerivedTx,
      space: core.space.DerivedTx,
      params: null
    }
    this.broadcast([tx], targets)
  }

  private async broadcastNonMembers (space: Space | undefined): Promise<void> {
    const users = await this.storage.modelDb.findAll(core.class.Account, { _id: { $nin: space?.members } })
    await this.brodcastEvent(users.map((p) => p._id))
  }

  private async handleUpdate (ctx: SessionContext, tx: TxCUD<Space>): Promise<void> {
    const updateDoc = tx as TxUpdateDoc<Space>
    if (!this.storage.hierarchy.isDerived(updateDoc.objectClass, core.class.Space)) return

    if (updateDoc.operations.private !== undefined) {
      if (updateDoc.operations.private) {
        const res = (await this.storage.findAll(ctx, core.class.Space, { _id: updateDoc.objectId }))[0]
        if (res !== undefined) {
          res.private = true
          this.addSpace(res)
          this.removePublicSpace(res._id)
          await this.broadcastNonMembers(res)
        }
      } else if (!updateDoc.operations.private) {
        const space = this.privateSpaces[updateDoc.objectId]
        this.removeSpace(updateDoc.objectId)
        this.publicSpaces.push(updateDoc.objectId)
        await this.broadcastNonMembers(space)
      }
    }

    let space = this.privateSpaces[updateDoc.objectId]
    if (space !== undefined) {
      if (updateDoc.operations.members !== undefined) {
        await this.syncMembers(updateDoc.operations.members, space)
      }
      if (updateDoc.operations.$push?.members !== undefined) {
        await this.pushMembersHandle(updateDoc.operations.$push.members, space._id)
      }

      if (updateDoc.operations.$pull?.members !== undefined) {
        await this.pullMembersHandle(updateDoc.operations.$pull.members, space._id)
      }
      space = TxProcessor.updateDoc2Doc(space, updateDoc)
    }
  }

  private handleRemove (tx: TxCUD<Space>): void {
    const removeTx = tx as TxRemoveDoc<Space>
    if (!this.storage.hierarchy.isDerived(removeTx.objectClass, core.class.Space)) return
    if (removeTx._class !== core.class.TxCreateDoc) return
    this.removeSpace(tx.objectId)
    this.removePublicSpace(tx.objectId)
  }

  private async handleTx (ctx: SessionContext, tx: TxCUD<Space>): Promise<void> {
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
      } else {
        const space = this.privateSpaces[tx.objectSpace]
        if (space !== undefined) {
          targets = await this.getTargets(space.members)
          if (!isOwner(account)) {
            const cudTx = tx as TxCUD<Doc>
            const isSpace = h.isDerived(cudTx.objectClass, core.class.Space)
            const allowed = this.allowedSpaces[account._id]
            if (allowed === undefined || !allowed.includes(isSpace ? (cudTx.objectId as Ref<Space>) : tx.objectSpace)) {
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

  private async proccessTx (ctx: SessionContext, tx: Tx): Promise<void> {
    const h = this.storage.hierarchy
    if (h.isDerived(tx._class, core.class.TxCUD)) {
      const cudTx = tx as TxCUD<Doc>
      const isSpace = h.isDerived(cudTx.objectClass, core.class.Space)
      if (isSpace) {
        await this.handleTx(ctx, cudTx as TxCUD<Space>)
      }
      if (h.isDerived(cudTx.objectClass, core.class.Account) && cudTx._class === core.class.TxUpdateDoc) {
        const ctx = cudTx as TxUpdateDoc<Account>
        if (ctx.operations.role !== undefined) {
          await this.brodcastEvent([ctx.objectId])
        }
      }
    }
  }

  async tx (ctx: SessionContext, tx: Tx): Promise<TxMiddlewareResult> {
    await this.proccessTx(ctx, tx)
    const targets = await this.getTxTargets(ctx, tx)
    const res = await this.provideTx(ctx, tx)
    for (const tx of res[1]) {
      await this.proccessTx(ctx, tx)
    }
    return [res[0], res[1], mergeTargets(targets, res[2])]
  }

  private async getAllAllowedSpaces (account: Account): Promise<Ref<Space>[]> {
    let userSpaces: Ref<Space>[] = []
    try {
      userSpaces = this.allowedSpaces[account._id] ?? []
      return [...userSpaces, account._id as string as Ref<Space>, ...this.publicSpaces, ...this.systemSpaces]
    } catch {
      return [...this.publicSpaces, ...this.systemSpaces]
    }
  }

  private async mergeQuery<T extends Doc>(
    account: Account,
    query: ObjQueryType<T['space']>
  ): Promise<ObjQueryType<T['space']>> {
    const spaces = await this.getAllAllowedSpaces(account)
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

  private getKey<T extends Doc>(_class: Ref<Class<T>>): string {
    return this.storage.hierarchy.isDerived(_class, core.class.Tx)
      ? 'objectSpace'
      : this.storage.hierarchy.isDerived(_class, core.class.Space)
        ? '_id'
        : 'space'
  }

  override async findAll<T extends Doc>(
    ctx: SessionContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const newQuery = query
    const account = await getUser(this.storage, ctx)
    const field = this.getKey(_class)

    if (!isSystem(account)) {
      if (!isOwner(account) || !this.storage.hierarchy.isDerived(_class, core.class.Space)) {
        if (query[field] !== undefined) {
          ;(newQuery as any)[field] = await this.mergeQuery(account, query[field])
        } else {
          const spaces = await this.getAllAllowedSpaces(account)
          ;(newQuery as any)[field] = { $in: spaces }
        }
      }
    }
    const findResult = await this.provideFindAll(ctx, _class, newQuery, options)
    if (!isOwner(account)) {
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
    const newQuery = { ...query }
    const account = await getUser(this.storage, ctx)
    if (!isSystem(account)) {
      newQuery.spaces = await this.getAllAllowedSpaces(account)
    }
    const result = await this.provideSearchFulltext(ctx, newQuery, options)
    return result
  }

  async isUnavailable (ctx: SessionContext, space: Ref<Space>): Promise<boolean> {
    if (this.privateSpaces[space] === undefined) return false
    const account = await getUser(this.storage, ctx)
    if (isOwner(account)) return false
    return !this.allowedSpaces[account._id]?.includes(space)
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
