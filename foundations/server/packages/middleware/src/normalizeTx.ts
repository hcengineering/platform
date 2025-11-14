//
// Copyright © 2025 Hardcore Engineering Inc.
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
  type MeasureContext,
  type Tx,
  type SessionData,
  type TxApplyIf,
  type Ref,
  type Class,
  type Doc,
  type Space,
  type PersonId,
  TxProcessor,
  type TxWorkspaceEvent,
  type OperationDomain,
  type TxDomainEvent,
  type TxCUD,
  type TxModelUpgrade,
  type TxCreateDoc,
  type TxUpdateDoc,
  type TxRemoveDoc,
  type TxMixin,
  type Mixin
} from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import {
  BaseMiddleware,
  type Middleware,
  type TxMiddlewareResult,
  type PipelineContext
} from '@hcengineering/server-core'

// Helper types to require update in validation after Tx types are changed
type ExplicitUndefined<T> = { [P in keyof Required<T>]: Exclude<T[P], undefined> | Extract<T[P], undefined> }
type WithIdType<T, I> = Omit<T, '_id'> & { _id: I }
type ExplicitTx<T> = WithIdType<ExplicitUndefined<T>, Ref<Tx>>

/**
 * Validates properties in known Tx interfaces and removes unrecognized properties
 * @public
 */
export class NormalizeTxMiddleware extends BaseMiddleware implements Middleware {
  private constructor (context: PipelineContext, next?: Middleware) {
    super(context, next)
  }

  static async create (
    ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined
  ): Promise<NormalizeTxMiddleware> {
    return new NormalizeTxMiddleware(context, next)
  }

  tx (ctx: MeasureContext<SessionData>, txes: unknown[]): Promise<TxMiddlewareResult> {
    const parsedTxes = []
    for (const tx of txes) {
      const parsedTx = this.parseTx(tx)
      if (parsedTx === undefined) {
        throw new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
      }
      parsedTxes.push(parsedTx)
    }
    return this.provideTx(ctx, parsedTxes)
  }

  private checkMeta (meta: unknown): meta is Record<string, string | number | boolean> | undefined {
    if (meta === undefined) {
      return true
    }
    if (meta === null || typeof meta !== 'object') {
      return false
    }
    for (const [, val] of Object.entries(meta)) {
      if (typeof val !== 'string' && typeof val !== 'number' && typeof val !== 'boolean') {
        return false
      }
    }
    return true
  }

  private parseBaseTx (source: unknown): ExplicitTx<Tx> | undefined {
    if (source == null || typeof source !== 'object') {
      return undefined
    }
    const { _class, _id, space, modifiedBy, modifiedOn, createdBy, createdOn, objectSpace, meta } = source as Record<
    keyof Tx,
    unknown
    >
    const isTxValid =
      typeof _class === 'string' &&
      typeof _id === 'string' &&
      typeof space === 'string' &&
      typeof modifiedBy === 'string' &&
      typeof modifiedOn === 'number' &&
      (createdBy === undefined || typeof createdBy === 'string') &&
      (createdOn === undefined || typeof createdOn === 'number') &&
      typeof objectSpace === 'string' &&
      this.checkMeta(meta)
    if (!isTxValid) {
      return undefined
    }
    const baseTx: ExplicitTx<Tx> = {
      _class: _class as Ref<Class<Doc>>,
      _id: _id as Ref<Tx>,
      space: space as Ref<Space>,
      modifiedBy: modifiedBy as PersonId,
      modifiedOn,
      createdBy: createdBy as PersonId | undefined,
      createdOn,
      objectSpace: objectSpace as Ref<Space>,
      meta: meta as Record<string, any> | undefined
    }
    return baseTx
  }

  private parseTx (source: unknown): Tx | undefined {
    const baseTx = this.parseBaseTx(source)
    if (baseTx === undefined) {
      return undefined
    }

    if (TxProcessor.isExtendsCUD(baseTx._class)) {
      return this.parseTxCUD(source, baseTx)
    } else if (baseTx._class === core.class.TxWorkspaceEvent) {
      const { event, params } = source as any
      if (typeof event !== 'number') {
        return undefined
      }
      const workspaceEvent: ExplicitTx<TxWorkspaceEvent> = Object.assign(baseTx, {
        event,
        params
      })
      return workspaceEvent
    } else if (baseTx._class === core.class.TxDomainEvent) {
      const { domain, event } = source as any
      if (typeof domain !== 'string') {
        return undefined
      }
      const domainEvent: ExplicitTx<TxDomainEvent> = Object.assign(baseTx, {
        domain: domain as OperationDomain,
        event
      })
      return domainEvent
    } else if (baseTx._class === core.class.TxApplyIf) {
      const { scope, match, notMatch, txes, notify, extraNotify, measureName } = source as Record<
      keyof TxApplyIf,
      unknown
      >
      const isValid =
        (scope === undefined || typeof scope === 'string') &&
        (match === undefined || Array.isArray(match)) &&
        (notMatch === undefined || Array.isArray(notMatch)) &&
        Array.isArray(txes) &&
        (notify === undefined || typeof notify === 'boolean') &&
        (extraNotify === undefined || Array.isArray(extraNotify)) &&
        (measureName === undefined || typeof measureName === 'string')
      if (!isValid) {
        return undefined
      }
      const parsedTxes: TxCUD<Doc>[] = []
      for (const tx of txes) {
        const baseChildTx = this.parseBaseTx(tx)
        if (baseChildTx === undefined || !TxProcessor.isExtendsCUD(baseChildTx._class)) {
          return undefined
        }
        const parsed = this.parseTxCUD(tx, baseChildTx)
        if (parsed === undefined) {
          return undefined
        }
        parsedTxes.push(parsed as TxCUD<Doc>)
      }
      const applyIf: ExplicitTx<TxApplyIf> = Object.assign(baseTx, {
        scope,
        match,
        notMatch,
        txes: parsedTxes,
        notify,
        extraNotify,
        measureName
      })
      return applyIf
    } else if (baseTx._class === core.class.TxModelUpgrade) {
      const modelUpgrade: TxModelUpgrade = baseTx
      return modelUpgrade
    }

    return undefined
  }

  private parseTxCUD (source: unknown, base: ExplicitTx<Tx>): ExplicitTx<TxCUD<Doc>> | undefined {
    const { objectId, objectClass, attachedTo, attachedToClass, collection } = source as Record<
    keyof TxCUD<Doc>,
    unknown
    >
    const isValid =
      typeof objectId === 'string' &&
      typeof objectClass === 'string' &&
      (attachedTo === undefined || typeof attachedTo === 'string') &&
      (attachedToClass === undefined || typeof attachedToClass === 'string') &&
      (collection === undefined || typeof collection === 'string')
    if (!isValid) {
      return undefined
    }
    const baseCUD: ExplicitTx<TxCUD<Doc>> = Object.assign(base, {
      objectId: objectId as Ref<Doc>,
      objectClass: objectClass as Ref<Class<Doc>>,
      attachedTo: attachedTo as Ref<Doc>,
      attachedToClass: attachedToClass as Ref<Class<Doc>>,
      collection
    })
    if (baseCUD._class === core.class.TxCreateDoc) {
      const { attributes } = source as Record<keyof TxCreateDoc<Doc>, unknown>
      if (typeof attributes !== 'object' || attributes === null) {
        return undefined
      }
      const createDoc: ExplicitTx<TxCreateDoc<Doc>> = Object.assign(baseCUD, { attributes })
      return createDoc
    } else if (baseCUD._class === core.class.TxUpdateDoc) {
      const { operations, retrieve } = source as Record<keyof TxUpdateDoc<Doc>, unknown>
      if (
        typeof operations !== 'object' ||
        operations === null ||
        (retrieve !== undefined && typeof retrieve !== 'boolean')
      ) {
        return undefined
      }
      const updateDoc: ExplicitTx<TxUpdateDoc<Doc>> = Object.assign(baseCUD, { operations, retrieve })
      return updateDoc
    } else if (baseCUD._class === core.class.TxRemoveDoc) {
      const removeDoc: ExplicitTx<TxRemoveDoc<Doc>> = baseCUD
      return removeDoc
    } else if (baseCUD._class === core.class.TxMixin) {
      const { mixin, attributes } = source as Record<keyof TxMixin<Doc, Doc>, unknown>
      if (typeof mixin !== 'string' || typeof attributes !== 'object' || attributes === null) {
        return undefined
      }
      const txMixin: ExplicitTx<TxMixin<Doc, Doc>> = Object.assign(baseCUD, {
        mixin: mixin as Ref<Mixin<Doc>>,
        attributes
      })
      return txMixin
    } else {
      return undefined
    }
  }
}
