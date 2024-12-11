import core, {
  WorkspaceEvent,
  generateId,
  getTypeOf,
  type WorkspaceIds,
  type Account,
  type BackupClient,
  type Branding,
  type BrandingMap,
  type BulkUpdateEvent,
  type Class,
  type Client,
  type Doc,
  type MeasureContext,
  type ModelDb,
  type Ref,
  type SessionData,
  type TxWorkspaceEvent,
  type PersonId,
  systemAccount
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import { type Hash } from 'crypto'
import fs from 'fs'
import { BackupClientOps } from './storage'
import type { Pipeline } from './types'

/**
 * Return some estimation for object size
 */
export function estimateDocSize (_obj: any): number {
  let result = 0
  const toProcess = [_obj]
  while (toProcess.length > 0) {
    const obj = toProcess.shift()
    if (typeof obj === 'undefined') {
      continue
    }
    if (typeof obj === 'function') {
      continue
    }
    for (const key in obj) {
      // include prototype properties
      const value = obj[key]
      const type = getTypeOf(value)
      result += key.length

      switch (type) {
        case 'Array':
          result += 4
          toProcess.push(value)
          break
        case 'Object':
          toProcess.push(value)
          break
        case 'Date':
          result += 24 // Some value
          break
        case 'string':
          result += (value as string).length
          break
        case 'number':
          result += 8
          break
        case 'boolean':
          result += 1
          break
        case 'symbol':
          result += (value as symbol).toString().length
          break
        case 'bigint':
          result += (value as bigint).toString().length
          break
        case 'undefined':
          result += 1
          break
        case 'null':
          result += 1
          break
        default:
          result += value.toString().length
      }
    }
  }
  return result
}
/**
 * Calculate hash for object
 */
export function updateHashForDoc (hash: Hash, _obj: any): void {
  const toProcess = [_obj]
  while (toProcess.length > 0) {
    const obj = toProcess.shift()
    if (typeof obj === 'undefined') {
      continue
    }
    if (typeof obj === 'function') {
      continue
    }
    const keys = Object.keys(obj).sort()
    // We need sorted list of keys to make it consistent
    for (const key of keys) {
      // include prototype properties
      const value = obj[key]
      const type = getTypeOf(value)
      hash.update(key)

      switch (type) {
        case 'Array':
          toProcess.push(value)
          break
        case 'Object':
          toProcess.push(value)
          break
        case 'Date':
          hash.update(value.toString())
          break
        case 'string':
          hash.update(value)
          break
        case 'number':
          hash.update((value as number).toString(16))
          break
        case 'boolean':
          hash.update((value as boolean) ? '1' : '0')
          break
        case 'symbol':
          hash.update((value as symbol).toString())
          break
        case 'bigint':
          hash.update((value as bigint).toString())
          break
        case 'undefined':
          hash.update('und')
          break
        case 'null':
          hash.update('null')
          break
        default:
          hash.update(value.toString())
      }
    }
  }
}

export class SessionDataImpl implements SessionData {
  constructor (
    readonly account: Account,
    readonly sessionId: string,
    readonly admin: boolean | undefined,
    readonly broadcast: SessionData['broadcast'],
    readonly workspace: WorkspaceIds,
    readonly branding: Branding | null,
    readonly isAsyncContext: boolean,
    readonly removedMap: Map<Ref<Doc>, Doc>,
    readonly contextCache: Map<string, any>,
    readonly modelDb: ModelDb,
    readonly socialStringsToUsers: Map<PersonId, string>
  ) {}
}

export function createBroadcastEvent (classes: Ref<Class<Doc>>[]): TxWorkspaceEvent<BulkUpdateEvent> {
  return {
    _class: core.class.TxWorkspaceEvent,
    _id: generateId(),
    event: WorkspaceEvent.BulkUpdate,
    params: {
      _class: classes
    },
    modifiedBy: core.account.System,
    modifiedOn: Date.now(),
    objectSpace: core.space.DerivedTx,
    space: core.space.DerivedTx
  }
}

export function loadBrandingMap (brandingPath?: string): BrandingMap {
  let brandings: BrandingMap = {}
  if (brandingPath !== undefined && brandingPath !== '') {
    brandings = JSON.parse(fs.readFileSync(brandingPath, 'utf8'))

    for (const [host, value] of Object.entries(brandings)) {
      const protocol = value.protocol ?? 'https'
      value.front = `${protocol}://${host}/`
    }
  }

  return brandings
}

export function wrapPipeline (
  ctx: MeasureContext,
  pipeline: Pipeline,
  wsIds: WorkspaceIds
): Client & BackupClient {
  const contextData = new SessionDataImpl(
    systemAccount,
    'pipeline',
    true,
    { targets: {}, txes: [] },
    wsIds,
    null,
    true,
    new Map(),
    new Map(),
    pipeline.context.modelDb,
    new Map()
  )
  ctx.contextData = contextData
  if (pipeline.context.lowLevelStorage === undefined) {
    throw new PlatformError(unknownError('Low level storage is not available'))
  }
  const backupOps = new BackupClientOps(pipeline.context.lowLevelStorage)

  return {
    findAll: (_class, query, options) => pipeline.findAll(ctx, _class, query, options),
    findOne: async (_class, query, options) =>
      (await pipeline.findAll(ctx, _class, query, { ...options, limit: 1 })).shift(),
    clean: (domain, docs) => backupOps.clean(ctx, domain, docs),
    close: () => pipeline.close(),
    closeChunk: (idx) => backupOps.closeChunk(ctx, idx),
    getHierarchy: () => pipeline.context.hierarchy,
    getModel: () => pipeline.context.modelDb,
    loadChunk: (domain, idx) => backupOps.loadChunk(ctx, domain, idx),
    loadDocs: (domain, docs) => backupOps.loadDocs(ctx, domain, docs),
    upload: (domain, docs) => backupOps.upload(ctx, domain, docs),
    searchFulltext: async (query, options) => ({ docs: [], total: 0 }),
    sendForceClose: async () => {},
    tx: (tx) => pipeline.tx(ctx, [tx]),
    notify: (...tx) => {}
  }
}
