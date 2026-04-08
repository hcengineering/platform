//
// Copyright © 2026 Hardcore Engineering Inc.
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
  AccountRole,
  type Class,
  type Collaborator,
  type Doc,
  type DocumentQuery,
  type FindResult,
  getClassCollaborators,
  type MeasureContext,
  type Ref,
  type SessionData,
  systemAccountUuid
} from '@hcengineering/core'
import {
  BaseMiddleware,
  type Middleware,
  type PipelineContext,
  type ServerFindOptions
} from '@hcengineering/server-core'

/** Intersects a find query with _id ∈ allowed (empty → no matches). Ref<T>[] matches DocumentQuery _id $in. */
function mergeDocIdRestriction<T extends Doc> (query: DocumentQuery<T>, allowed: Ref<T>[]): DocumentQuery<T> {
  const allowedIds: DocumentQuery<T>['_id'] = { $in: allowed.length === 0 ? [] : allowed }
  const prevId = query._id
  if (prevId === undefined) {
    return { ...query, _id: allowedIds }
  }
  type WithAnd = DocumentQuery<T> & { $and?: DocumentQuery<T>[] }
  const { _id: _drop, $and, ...rest } = query as WithAnd
  const andParts: DocumentQuery<T>[] = [
    ...($and ?? []),
    { _id: prevId },
    { _id: allowedIds }
  ]
  // Spreading rest + $and is not inferred as DocumentQuery<T> (mapped type + index signature).
  const merged: DocumentQuery<T> = { ...rest, $and: andParts }
  return merged
}

/**
 * Restricts findAll for classes with ClassCollaborators.guestReadCollaboratorOnly so that
 * Guest / ReadOnlyGuest only receive documents they are collaborators on (Mongo and any adapter
 * without SQL collaborator OR-clauses).
 */
export class GuestCollaboratorClassReadMiddleware extends BaseMiddleware implements Middleware {
  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined
  ): Promise<GuestCollaboratorClassReadMiddleware> {
    return new GuestCollaboratorClassReadMiddleware(context, next)
  }

  override async findAll<T extends Doc>(
    ctx: MeasureContext<SessionData>,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: ServerFindOptions<T>
  ): Promise<FindResult<T>> {
    const session = ctx.contextData
    if (session?.isTriggerCtx === true) {
      return await this.provideFindAll(ctx, _class, query, options)
    }
    const account = session?.account
    if (account === undefined || account.uuid === systemAccountUuid) {
      return await this.provideFindAll(ctx, _class, query, options)
    }
    if (![AccountRole.Guest, AccountRole.ReadOnlyGuest].includes(account.role)) {
      return await this.provideFindAll(ctx, _class, query, options)
    }
    const collabSec = getClassCollaborators(this.context.modelDb, this.context.hierarchy, _class)
    if (collabSec?.provideSecurity !== true || collabSec?.guestReadCollaboratorOnly !== true) {
      return await this.provideFindAll(ctx, _class, query, options)
    }
    const rootClass = collabSec.attachedTo
    const docClasses = [...this.context.hierarchy.getDescendants(rootClass), rootClass]
    const collabQuery: DocumentQuery<Collaborator> = {
      collaborator: account.uuid,
      attachedToClass: { $in: docClasses }
    }
    const collabs = await this.provideFindAll(ctx, core.class.Collaborator, collabQuery, {
      projection: { attachedTo: 1 },
      limit: 10_000
    })
    const allowed = collabs.map((c) => c.attachedTo) as Ref<T>[]
    const newQuery = mergeDocIdRestriction(query, allowed)
    if (collabs.length >= 10_000) {
      ctx.warn('Guest collaborator id list truncated at 10000; find may miss rows', {
        account: account.uuid,
        _class
      })
    }
    return await this.provideFindAll(ctx, _class, newQuery, options)
  }
}
