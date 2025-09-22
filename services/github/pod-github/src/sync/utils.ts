import { Analytics } from '@hcengineering/analytics'
import core, {
  AttachedDoc,
  Class,
  Doc,
  DocumentQuery,
  DocumentUpdate,
  MeasureContext,
  PersonId,
  Ref,
  SortingOrder,
  Status,
  Timestamp,
  TxOperations
} from '@hcengineering/core'
import github, {
  DocSyncInfo,
  GithubIntegrationRepository,
  GithubIssueStateReason,
  GithubProject
} from '@hcengineering/github'
import { PlatformError, unknownStatus } from '@hcengineering/platform'
import task from '@hcengineering/task'
import { IssueStatus } from '@hcengineering/tracker'
import { deepEqual } from 'fast-equals'
import { githubExternalSyncVersion } from '../types'

/**
 * Return if github write operations are allowed.
 */
export function isGHWriteAllowed (): boolean {
  if (process.env.GITHUB_READONLY === 'true') {
    return false
  }
  return true
}

/**
 * @public
 */
export function collectUpdate<T extends Doc> (
  doc: Record<string, any>,
  newDoc: Record<string, any>,
  keys: string[]
): DocumentUpdate<T> {
  const documentUpdate: DocumentUpdate<Doc> = {}
  function toUndefinedValues (a: any): any {
    if (typeof a === 'object' && a != null) {
      const newA: any = {}
      for (const [k, v] of Object.entries(a)) {
        if (v === null) {
          newA[k] = undefined
        } else {
          newA[k] = toUndefinedValues(v)
        }
      }
      return newA
    }
    return a ?? undefined
  }
  for (const k of keys) {
    const v = newDoc[k]
    if (!keys.includes(k)) {
      continue
    }
    if (['_class', '_id', 'modifiedBy', 'modifiedOn', 'space', 'attachedTo', 'attachedToClass'].includes(k)) {
      continue
    }
    let vv = v
    if (vv === undefined) {
      vv = null
    }
    const dv = (doc as any)[k]
    if (!deepEqual(toUndefinedValues(dv), toUndefinedValues(v))) {
      ;(documentUpdate as any)[k] = vv
    }
  }
  return documentUpdate as DocumentUpdate<T>
}

/**
 * @public
 */
export async function getSince (
  _client: TxOperations,
  _class: Ref<Class<Doc>>,
  repo: GithubIntegrationRepository
): Promise<string | undefined> {
  const lastModified: Timestamp | undefined = await getSinceRaw(_client, _class, repo)
  return lastModified !== undefined ? new Date(lastModified + 1)?.toISOString() : undefined
}

/**
 * @public
 */
export async function getSinceRaw (
  _client: TxOperations,
  _class: Ref<Class<Doc>>,
  repo: GithubIntegrationRepository
): Promise<number | undefined> {
  if (repo.githubProject == null) {
    return undefined
  }
  return (
    await _client.findOne(
      github.class.DocSyncInfo,
      {
        objectClass: _class,
        space: repo.githubProject,
        lastModified: { $exists: true },
        externalVersion: githubExternalSyncVersion,
        externalVersionSince: { $ne: '#' },
        repository: repo._id
      },
      { sort: { lastModified: SortingOrder.Descending }, limit: 1 }
    )
  )?.lastModified
}

/**
 * @public
 */
export function gqlp (params: Record<string, string | number | string[] | undefined>): string {
  let result = ''
  let first = true
  function escape (str: string): string {
    return str.replace(/"/g, '\\"')
  }
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) {
      if (!first) {
        result += ', '
      }
      first = false
      if (typeof v === 'number') {
        result += `${k}: ${v}`
      } else if (Array.isArray(v)) {
        result += `${k}: [${v.map((it) => `"${escape(it)}"`).join(', ')}]`
      } else {
        result += `${k}: "${escape(v)}"`
      }
    }
  }
  return result
}

/**
 * @public
 */
export function hashCode (str: string): number {
  return str.split('').reduce((prevHash, currVal) => ((prevHash << 5) - prevHash + currVal.charCodeAt(0)) | 0, 0)
}

export async function guessStatus (
  pr: { state: 'OPEN' | 'CLOSED' | 'MERGED', stateReason?: GithubIssueStateReason | null },
  statuses: Status[]
): Promise<IssueStatus> {
  const unstarted = (): Status | undefined => statuses.find((it) => it.category === task.statusCategory.UnStarted)

  const todo = (): Status | undefined => statuses.find((it) => it.category === task.statusCategory.ToDo)
  const active = (): Status | undefined => statuses.find((it) => it.category === task.statusCategory.Active)

  const canceled = (): Status | undefined => statuses.find((it) => it.category === task.statusCategory.Lost)
  const completed = (): Status | undefined => statuses.find((it) => it.category === task.statusCategory.Won)

  let result: IssueStatus | undefined

  if (pr.state === 'OPEN' && pr.stateReason == null) {
    result = unstarted() ?? todo() ?? active()
  } else if (pr.state === 'OPEN' && pr.stateReason === GithubIssueStateReason.Reopened) {
    result = active()
  } else if (pr.state === 'CLOSED' && pr.stateReason === GithubIssueStateReason.NotPlanned) {
    result = canceled()
  } else if (pr.state === 'CLOSED' || pr.state === 'MERGED') {
    result = completed()
  } else {
    // By default put into backlog
    result = unstarted() ?? todo() ?? active()
  }
  if (result === undefined) {
    throw new PlatformError(unknownStatus(`No status found for GH issue status ${pr.state} ${pr.stateReason}`))
  }
  return result
}

/**
 * @public
 */
export class SyncRunner {
  eventSync = new Map<string, Promise<void>>()

  async exec<T>(id: string, op: () => Promise<T>): Promise<T> {
    await this.eventSync.get(id)
    const promise = op()
    this.eventSync.set(
      id,
      promise.then(() => {})
    )
    try {
      return await promise
    } finally {
      this.eventSync.delete(id)
    }
  }
}

/**
 * @public
 */
export const syncRunner = new SyncRunner()

export async function deleteObjects (
  ctx: MeasureContext,
  client: TxOperations,
  objects: Doc[],
  account: PersonId
): Promise<void> {
  const ops = client.apply()
  for (const object of objects) {
    if (client.getHierarchy().isDerived(object._class, core.class.AttachedDoc)) {
      const adoc = object as AttachedDoc
      await ops
        .removeCollection(
          object._class,
          object.space,
          adoc._id,
          adoc.attachedTo,
          adoc.attachedToClass,
          adoc.collection,
          Date.now(),
          account
        )
        .catch((err) => {
          Analytics.handleError(err)
          ctx.error('filed to remove collection', err)
        })
    } else {
      await ops.removeDoc(object._class, object.space, object._id, Date.now(), account).catch((err) => {
        Analytics.handleError(err)
        ctx.error('filed to remove doc', err)
      })
    }
  }
  await ops.commit()
}

export async function syncDerivedDocuments<T extends { url: string }> (
  derivedClient: TxOperations,
  parentDoc: DocSyncInfo,
  ext: T,
  prj: GithubProject,
  repo: GithubIntegrationRepository,
  objectClass: Ref<Class<Doc>>,
  query: DocumentQuery<DocSyncInfo>,
  docs: (ext: T) => { url: string, updatedAt: string | null, createdAt: string }[],
  extra?: any
): Promise<void> {
  const childDocsOfClass = await derivedClient.findAll(github.class.DocSyncInfo, {
    space: prj._id,
    objectClass,
    parent: (parentDoc.url ?? '').toLowerCase(),
    ...query
  })

  const processed = new Set<Ref<DocSyncInfo>>()
  const _docs = docs(ext).filter((it) => it != null)
  for (const r of _docs) {
    const existing = childDocsOfClass.find((it) => it.url.toLowerCase() === r.url.toLowerCase())
    if (existing === undefined) {
      await derivedClient.createDoc<DocSyncInfo>(github.class.DocSyncInfo, prj._id, {
        objectClass,
        url: (r.url ?? '').toLowerCase(),
        needSync: '', // we need to sync to retrieve patch in background
        githubNumber: 0,
        repository: repo._id,
        external: r,
        externalVersion: githubExternalSyncVersion,
        derivedVersion: '',
        lastModified: new Date(r.updatedAt ?? r.createdAt).getTime(),
        parent: (ext.url ?? '').toLowerCase(),
        attachedTo: parentDoc._id,
        ...extra
      })
    } else {
      processed.add(existing._id)
      if (!deepEqual(existing.external, r) || existing.repository !== repo._id) {
        // Only update if had changes.
        await derivedClient.update(existing, {
          external: r,
          needSync: '', // We need to check if we had any changes.
          derivedVersion: '',
          repository: repo._id,
          externalVersion: githubExternalSyncVersion,
          lastModified: new Date(r.updatedAt ?? r.createdAt).getTime(),
          ...extra
        })
      }
    }
  }

  // Mark all non processed for delete.
  for (const d of childDocsOfClass.filter((it) => !processed.has(it._id))) {
    await derivedClient.update<DocSyncInfo>(d, { deleted: true, needSync: '' })
  }
}

const errorPrinter = ({ message, stack, ...rest }: Error): object => ({
  message,
  stack,
  ...rest
})
export function errorToObj (value: any): any {
  return value instanceof Error ? errorPrinter(value) : value
}

export function compareMarkdown (a: string, b: string): boolean {
  let na = a.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
  let nb = b.replaceAll('\r\n', '\n').replaceAll('\r', '\n')

  // Remove trailings before compare
  na = na
    .split('\n')
    .map((it) => it.trimEnd())
    .join('\n')
  nb = nb
    .split('\n')
    .map((it) => it.trimEnd())
    .join('\n')

  return na === nb
}

export async function syncChilds (
  ctx: MeasureContext,
  info: DocSyncInfo,
  client: TxOperations,
  derivedClient: TxOperations
): Promise<void> {
  const childInfos = await ctx.with('syncChilds-find', {}, () =>
    client.findAll(github.class.DocSyncInfo, { parent: info.url.toLowerCase() })
  )
  if (childInfos.length > 0) {
    const ops = derivedClient.apply()
    for (const child of childInfos) {
      await ops?.update(child, { needSync: '' })
    }
    await ctx.with('sync-child-trigger', {}, () => ops.commit())
  }
}
