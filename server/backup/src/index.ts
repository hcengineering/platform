//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  AttachedDoc,
  BackupClient,
  BlobData,
  Client as CoreClient,
  Doc,
  Domain,
  DOMAIN_MODEL,
  DOMAIN_TRANSIENT,
  Ref,
  TxCollectionCUD,
  WorkspaceId
} from '@hcengineering/core'
import { connect } from '@hcengineering/server-tool'
import { createGzip } from 'node:zlib'
import { join } from 'path'
import { Writable } from 'stream'
import { extract, Pack, pack } from 'tar-stream'
import { createGunzip, gunzipSync, gzipSync } from 'zlib'
import { BackupStorage } from './storage'
export * from './storage'

const dataBlobSize = 50 * 1024 * 1024
const dataUploadSize = 2 * 1024 * 1024

/**
 * @public
 */
export interface Snapshot {
  added: Map<Ref<Doc>, string>
  updated: Map<Ref<Doc>, string>
  removed: Ref<Doc>[]
}

/**
 * @public
 */
export interface SnapshotV6 {
  added: Record<Ref<Doc>, string>
  updated: Record<Ref<Doc>, string>
  removed: Ref<Doc>[]
}

/**
 * @public
 */
export interface DomainData {
  snapshot?: string // 0.6 json snapshot
  snapshots?: string[]
  storage?: string[]

  // Some statistics
  added: number
  updated: number
  removed: number
}

/**
 * @public
 */
export interface BackupSnapshot {
  // _id => hash of added items.
  domains: Record<Domain, DomainData>
  date: number
}

/**
 * @public
 */
export interface BackupInfo {
  workspace: string
  version: string
  productId: string
  snapshots: BackupSnapshot[]
}

async function loadDigest (
  storage: BackupStorage,
  snapshots: BackupSnapshot[],
  domain: Domain,
  date?: number
): Promise<Map<Ref<Doc>, string>> {
  const result = new Map<Ref<Doc>, string>()
  for (const s of snapshots) {
    const d = s.domains[domain]

    // Load old JSON snapshot
    if (d?.snapshot !== undefined) {
      const dChanges: SnapshotV6 = JSON.parse(gunzipSync(await storage.loadFile(d.snapshot)).toString())
      for (const [k, v] of Object.entries(dChanges.added)) {
        result.set(k as Ref<Doc>, v)
      }
      for (const [k, v] of Object.entries(dChanges.updated)) {
        result.set(k as Ref<Doc>, v)
      }
      for (const d of dChanges.removed) {
        result.delete(d)
      }
    }
    for (const snapshot of d?.snapshots ?? []) {
      try {
        const dataBlob = gunzipSync(await storage.loadFile(snapshot))
          .toString()
          .split('\n')
        console.log('loaded', snapshot, dataBlob.length)

        const addedCount = parseInt(dataBlob.shift() ?? '0')
        const added = dataBlob.splice(0, addedCount)
        for (const it of added) {
          const [k, v] = it.split(';')
          result.set(k as Ref<Doc>, v)
        }

        const updatedCount = parseInt(dataBlob.shift() ?? '0')
        const updated = dataBlob.splice(0, updatedCount)
        for (const it of updated) {
          const [k, v] = it.split(';')
          result.set(k as Ref<Doc>, v)
        }

        const removedCount = parseInt(dataBlob.shift() ?? '0')
        const removed = dataBlob.splice(0, removedCount)
        for (const k of removed) {
          result.delete(k as Ref<Doc>)
        }
      } catch (err: any) {
        console.log('digest is broken, will do full backup for', domain)
      }
    }
    // Stop if stop date is matched and provided
    if (date !== undefined && date === s.date) {
      break
    }
  }
  return result
}

async function write (chunk: any, stream: Writable): Promise<void> {
  let needDrain = false
  await new Promise((resolve, reject) => {
    needDrain = !stream.write(chunk, (err) => {
      if (err != null) {
        reject(err)
      } else {
        resolve(null)
      }
    })
  })
  if (needDrain) {
    await new Promise((resolve, reject) => stream.once('drain', resolve))
  }
}

async function writeChanges (storage: BackupStorage, snapshot: string, changes: Snapshot): Promise<void> {
  const snapshotWritable = await storage.write(snapshot)
  const writable = createGzip()
  writable.pipe(snapshotWritable)

  // Write size
  await write(`${changes.added.size}\n`, writable)
  for (const [k, v] of changes.added.entries()) {
    await write(`${k};${v}\n`, writable)
  }
  await write(`${changes.updated.size}\n`, writable)
  for (const [k, v] of changes.updated.entries()) {
    await write(`${k};${v}\n`, writable)
  }
  await write(`${changes.removed.length}\n`, writable)
  for (const k of changes.removed) {
    await write(`${k}\n`, writable)
  }
  writable.end()
  await new Promise((resolve) =>
    writable.flush(() => {
      resolve(null)
    })
  )
}

/**
 * @public
 */
export async function cloneWorkspace (
  transactorUrl: string,
  sourceWorkspaceId: WorkspaceId,
  targetWorkspaceId: WorkspaceId,
  clearTime: boolean = true
): Promise<void> {
  const sourceConnection = (await connect(transactorUrl, sourceWorkspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient
  const targetConnection = (await connect(transactorUrl, targetWorkspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient
  try {
    const domains = sourceConnection
      .getHierarchy()
      .domains()
      .filter((it) => it !== DOMAIN_TRANSIENT && it !== DOMAIN_MODEL)

    for (const c of domains) {
      console.log('clone domain...', c)

      const changes: Snapshot = {
        added: new Map(),
        updated: new Map(),
        removed: []
      }

      let idx: number | undefined

      // update digest tar
      const needRetrieveChunks: Ref<Doc>[][] = []

      let processed = 0
      let st = Date.now()
      // Load all digest from collection.
      while (true) {
        try {
          const it = await sourceConnection.loadChunk(c, idx)
          idx = it.idx

          const needRetrieve: Ref<Doc>[] = []

          for (const [k, v] of Object.entries(it.docs)) {
            processed++
            if (processed % 10000 === 0) {
              console.log('processed', processed, Date.now() - st)
              st = Date.now()
            }

            changes.added.set(k as Ref<Doc>, v)
            needRetrieve.push(k as Ref<Doc>)
          }
          if (needRetrieve.length > 0) {
            needRetrieveChunks.push(needRetrieve)
          }
          if (it.finished) {
            await sourceConnection.closeChunk(idx)
            break
          }
        } catch (err: any) {
          console.error(err)
          if (idx !== undefined) {
            await sourceConnection.closeChunk(idx)
          }
          // Try again
          idx = undefined
          processed = 0
        }
      }
      while (needRetrieveChunks.length > 0) {
        const needRetrieve = needRetrieveChunks.shift() as Ref<Doc>[]

        console.log('Retrieve chunk:', needRetrieve.length)
        let docs: Doc[] = []
        try {
          docs = await sourceConnection.loadDocs(c, needRetrieve)
          if (clearTime) {
            docs = docs.map((p) => {
              if (sourceConnection.getHierarchy().isDerived(p._class, core.class.TxCollectionCUD)) {
                return {
                  ...p,
                  createdBy: core.account.System,
                  modifiedBy: core.account.System,
                  modifiedOn: Date.now(),
                  createdOn: Date.now(),
                  tx: {
                    ...(p as TxCollectionCUD<Doc, AttachedDoc>).tx,
                    createdBy: core.account.System,
                    modifiedBy: core.account.System,
                    modifiedOn: Date.now(),
                    createdOn: Date.now()
                  }
                }
              } else {
                return {
                  ...p,
                  createdBy: core.account.System,
                  modifiedBy: core.account.System,
                  modifiedOn: Date.now(),
                  createdOn: Date.now()
                }
              }
            })
          }
          await targetConnection.upload(c, docs)
        } catch (err: any) {
          console.log(err)
          // Put back.
          needRetrieveChunks.push(needRetrieve)
          continue
        }
      }
    }
  } catch (err: any) {
    console.error(err)
  } finally {
    console.log('end clone')
    await sourceConnection.close()
    await targetConnection.close()
  }
}

/**
 * @public
 */
export async function backup (transactorUrl: string, workspaceId: WorkspaceId, storage: BackupStorage): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient
  console.log('starting backup')
  try {
    const domains = connection
      .getHierarchy()
      .domains()
      .filter((it) => it !== DOMAIN_TRANSIENT && it !== DOMAIN_MODEL)
    console.log('domains for dump', domains.length)

    let backupInfo: BackupInfo = {
      workspace: workspaceId.name,
      productId: workspaceId.productId,
      version: '0.6.1',
      snapshots: []
    }

    // Version 0.6.1, format of digest file is changed to

    const infoFile = 'backup.json.gz'

    if (await storage.exists(infoFile)) {
      backupInfo = JSON.parse(gunzipSync(await storage.loadFile(infoFile)).toString())
    }
    backupInfo.version = '0.6.1'

    backupInfo.workspace = workspaceId.name
    backupInfo.productId = workspaceId.productId

    const snapshot: BackupSnapshot = {
      date: Date.now(),
      domains: {}
    }

    backupInfo.snapshots.push(snapshot)
    let backupIndex = `${backupInfo.snapshots.length}`
    while (backupIndex.length < 6) {
      backupIndex = '0' + backupIndex
    }

    for (const c of domains) {
      console.log('dumping domain...', c)

      const changes: Snapshot = {
        added: new Map(),
        updated: new Map(),
        removed: []
      }

      const processedChanges: Snapshot = {
        added: new Map(),
        updated: new Map(),
        removed: []
      }

      let changed = 0
      let stIndex = 0
      let snapshotIndex = 0
      const domainInfo: DomainData = {
        snapshot: undefined,
        snapshots: [],
        storage: [],
        added: 0,
        updated: 0,
        removed: 0
      }

      // Cumulative digest
      const digest = await loadDigest(storage, backupInfo.snapshots, c)

      let idx: number | undefined

      let _pack: Pack | undefined
      let addedDocuments = 0

      // update digest tar
      const needRetrieveChunks: Ref<Doc>[][] = []

      let processed = 0
      let st = Date.now()
      // Load all digest from collection.
      while (true) {
        try {
          const it = await connection.loadChunk(c, idx)
          idx = it.idx

          const needRetrieve: Ref<Doc>[] = []

          for (const [k, v] of Object.entries(it.docs)) {
            processed++
            if (processed % 10000 === 0) {
              console.log('processed', processed, digest.size, Date.now() - st)
              st = Date.now()
            }
            const kHash = digest.get(k as Ref<Doc>)
            if (kHash !== undefined) {
              digest.delete(k as Ref<Doc>)
              if (kHash !== v) {
                changes.updated.set(k as Ref<Doc>, v)
                needRetrieve.push(k as Ref<Doc>)
                changed++
              }
            } else {
              changes.added.set(k as Ref<Doc>, v)
              needRetrieve.push(k as Ref<Doc>)
              changed++
            }
          }
          if (needRetrieve.length > 0) {
            needRetrieveChunks.push(needRetrieve)
          }
          if (it.finished) {
            await connection.closeChunk(idx)
            break
          }
        } catch (err: any) {
          console.error(err)
          if (idx !== undefined) {
            await connection.closeChunk(idx)
          }
          // Try again
          idx = undefined
          processed = 0
        }
      }
      while (needRetrieveChunks.length > 0) {
        const needRetrieve = needRetrieveChunks.shift() as Ref<Doc>[]

        console.log('Retrieve chunk:', needRetrieve.length)
        let docs: Doc[] = []
        try {
          docs = await connection.loadDocs(c, needRetrieve)
        } catch (err: any) {
          console.log(err)
          // Put back.
          needRetrieveChunks.push(needRetrieve)
          continue
        }

        // Chunk data into small pieces
        if (addedDocuments > dataBlobSize && _pack !== undefined) {
          _pack.finalize()
          _pack = undefined
          addedDocuments = 0

          if (changed > 0) {
            snapshot.domains[c] = domainInfo
            domainInfo.added += processedChanges.added.size
            domainInfo.updated += processedChanges.updated.size
            domainInfo.removed += processedChanges.removed.length

            const snapshotFile = join(backupIndex, `${c}-${snapshot.date}-${snapshotIndex}.snp.gz`)
            snapshotIndex++
            domainInfo.snapshots = [...(domainInfo.snapshots ?? []), snapshotFile]
            await writeChanges(storage, snapshotFile, processedChanges)

            processedChanges.added.clear()
            processedChanges.removed = []
            processedChanges.updated.clear()
            await storage.writeFile(infoFile, gzipSync(JSON.stringify(backupInfo, undefined, 2)))
          }
        }
        if (_pack === undefined) {
          _pack = pack()
          stIndex++
          const storageFile = join(backupIndex, `${c}-data-${snapshot.date}-${stIndex}.tar.gz`)
          console.log('storing from domain', c, storageFile)
          domainInfo.storage = [...(domainInfo.storage ?? []), storageFile]
          const dataStream = await storage.write(storageFile)
          const storageZip = createGzip()

          _pack.pipe(storageZip)
          storageZip.pipe(dataStream)
        }

        while (docs.length > 0) {
          const d = docs.shift()
          if (d === undefined) {
            break
          }

          // Move processed document to processedChanges
          if (changes.added.has(d._id)) {
            processedChanges.added.set(d._id, changes.added.get(d._id) ?? '')
            changes.added.delete(d._id)
          } else {
            processedChanges.updated.set(d._id, changes.updated.get(d._id) ?? '')
            changes.updated.delete(d._id)
          }
          if (d._class === core.class.BlobData) {
            const blob = d as BlobData
            const data = Buffer.from(blob.base64Data, 'base64')
            blob.base64Data = ''
            const descrJson = JSON.stringify(d)
            addedDocuments += descrJson.length
            addedDocuments += data.length
            _pack.entry({ name: d._id + '.json' }, descrJson, function (err) {
              if (err != null) throw err
            })
            _pack.entry({ name: d._id }, data, function (err) {
              if (err != null) throw err
            })
          } else {
            const data = JSON.stringify(d)
            addedDocuments += data.length
            _pack.entry({ name: d._id + '.json' }, data, function (err) {
              if (err != null) throw err
            })
          }
        }
      }
      processedChanges.removed = Array.from(digest.keys())
      if (processedChanges.removed.length > 0) {
        changed++
      }

      if (changed > 0) {
        snapshot.domains[c] = domainInfo
        domainInfo.added += processedChanges.added.size
        domainInfo.updated += processedChanges.updated.size
        domainInfo.removed += processedChanges.removed.length

        const snapshotFile = join(backupIndex, `${c}-${snapshot.date}-${snapshotIndex}.snp.gz`)
        snapshotIndex++
        domainInfo.snapshots = [...(domainInfo.snapshots ?? []), snapshotFile]
        await writeChanges(storage, snapshotFile, processedChanges)

        processedChanges.added.clear()
        processedChanges.removed = []
        processedChanges.updated.clear()
        _pack?.finalize()
        // This will allow to retry in case of critical error.
        await storage.writeFile(infoFile, gzipSync(JSON.stringify(backupInfo, undefined, 2)))
      }
    }

    await storage.writeFile(infoFile, gzipSync(JSON.stringify(backupInfo, undefined, 2)))
  } catch (err: any) {
    console.error(err)
  } finally {
    console.log('end backup')
    await connection.close()
  }
}

/**
 * @public
 */
export async function backupList (storage: BackupStorage): Promise<void> {
  const infoFile = 'backup.json.gz'

  if (!(await storage.exists(infoFile))) {
    throw new Error(`${infoFile} should present to restore`)
  }
  const backupInfo: BackupInfo = JSON.parse(gunzipSync(await storage.loadFile(infoFile)).toString())
  console.log('workspace:', backupInfo.workspace ?? '', backupInfo.version)
  for (const s of backupInfo.snapshots) {
    console.log('snapshot: id:', s.date, ' date:', new Date(s.date))
  }
}

/**
 * @public
 * Restore state of DB to specified point.
 */
export async function restore (
  transactorUrl: string,
  workspaceId: WorkspaceId,
  storage: BackupStorage,
  date: number,
  merge?: boolean
): Promise<void> {
  const infoFile = 'backup.json.gz'

  if (!(await storage.exists(infoFile))) {
    throw new Error(`${infoFile} should present to restore`)
  }
  const backupInfo: BackupInfo = JSON.parse(gunzipSync(await storage.loadFile(infoFile)).toString())
  let snapshots = backupInfo.snapshots
  if (date !== -1) {
    const bk = backupInfo.snapshots.findIndex((it) => it.date === date)
    if (bk === -1) {
      throw new Error(`${infoFile} could not restore to ${date}. Snapshot is missing.`)
    }
    snapshots = backupInfo.snapshots.slice(0, bk + 1)
  } else {
    date = snapshots[snapshots.length - 1].date
  }
  console.log('restore to ', date, new Date(date))
  const rsnapshots = Array.from(snapshots).reverse()

  // Collect all possible domains
  const domains = new Set<Domain>()
  for (const s of snapshots) {
    Object.keys(s.domains).forEach((it) => domains.add(it as Domain))
  }

  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup',
    model: 'upgrade'
  })) as unknown as CoreClient & BackupClient

  // We need to find empty domains and clean them.
  const allDomains = connection.getHierarchy().domains()
  for (const d of allDomains) {
    domains.add(d)
  }

  async function processDomain (c: Domain): Promise<void> {
    const changeset = await loadDigest(storage, snapshots, c, date)
    // We need to load full changeset from server
    const serverChangeset = new Map<Ref<Doc>, string>()

    let idx: number | undefined
    let loaded = 0
    let last = 0
    let el = 0
    let chunks = 0
    while (true) {
      const st = Date.now()
      const it = await connection.loadChunk(c, idx)
      chunks++

      idx = it.idx
      el += Date.now() - st

      for (const [_id, hash] of Object.entries(it.docs)) {
        serverChangeset.set(_id as Ref<Doc>, hash)
        loaded++
      }

      const mr = Math.round(loaded / 10000)
      if (mr !== last) {
        last = mr
        console.log(' loaded from server', loaded, el, chunks)
        el = 0
        chunks = 0
      }
      if (it.finished) {
        break
      }
    }
    console.log(' loaded', loaded)
    console.log('\tcompare documents', changeset.size, serverChangeset.size)

    // Let's find difference
    const docsToAdd = new Map(
      Array.from(changeset.entries()).filter(
        ([it]) => !serverChangeset.has(it) || (serverChangeset.has(it) && serverChangeset.get(it) !== changeset.get(it))
      )
    )
    const docsToRemove = Array.from(serverChangeset.keys()).filter((it) => !changeset.has(it))

    const docs: Doc[] = []
    const blobs = new Map<string, { doc: Doc | undefined, buffer: Buffer | undefined }>()
    let sendSize = 0
    let totalSend = 0
    async function sendChunk (doc: Doc | undefined, len: number): Promise<void> {
      if (doc !== undefined) {
        docsToAdd.delete(doc._id)
        docs.push(doc)
      }
      sendSize = sendSize + len
      if (sendSize > dataUploadSize || (doc === undefined && docs.length > 0)) {
        console.log('upload', docs.length, `send: ${totalSend} from ${docsToAdd.size + totalSend}`, 'size:', sendSize)
        totalSend += docs.length
        await connection.upload(c, docs)
        docs.length = 0
        sendSize = 0
      }
    }
    let processed = 0

    for (const s of rsnapshots) {
      const d = s.domains[c]

      if (d !== undefined && docsToAdd.size > 0) {
        const sDigest = await loadDigest(storage, [s], c)
        const requiredDocs = new Map(Array.from(sDigest.entries()).filter(([it]) => docsToAdd.has(it)))
        if (requiredDocs.size > 0) {
          console.log('updating', c, requiredDocs.size)
          // We have required documents here.
          for (const sf of d.storage ?? []) {
            if (docsToAdd.size === 0) {
              break
            }
            console.log('processing', sf, processed)

            const readStream = await storage.load(sf)
            const ex = extract()

            ex.on('entry', (headers, stream, next) => {
              const name = headers.name ?? ''
              processed++
              // We found blob data
              if (requiredDocs.has(name as Ref<Doc>)) {
                const chunks: Buffer[] = []
                stream.on('data', (chunk) => {
                  chunks.push(chunk)
                })
                stream.on('end', () => {
                  const bf = Buffer.concat(chunks)
                  const d = blobs.get(name)
                  if (d === undefined) {
                    blobs.set(name, { doc: undefined, buffer: bf })
                    next()
                  } else {
                    const d = blobs.get(name)
                    blobs.delete(name)
                    const doc = d?.doc as BlobData
                    doc.base64Data = bf.toString('base64') ?? ''
                    sendChunk(doc, bf.length).finally(() => {
                      requiredDocs.delete(doc._id)
                      next()
                    })
                  }
                })
              } else if (name.endsWith('.json') && requiredDocs.has(name.substring(0, name.length - 5) as Ref<Doc>)) {
                const chunks: Buffer[] = []
                const bname = name.substring(0, name.length - 5)
                stream.on('data', (chunk) => {
                  chunks.push(chunk)
                })
                stream.on('end', () => {
                  const bf = Buffer.concat(chunks)
                  const doc = JSON.parse(bf.toString()) as Doc
                  if (doc._class === core.class.BlobData) {
                    const d = blobs.get(bname)
                    if (d === undefined) {
                      blobs.set(bname, { doc, buffer: undefined })
                      next()
                    } else {
                      const d = blobs.get(bname)
                      blobs.delete(bname)
                      ;(doc as BlobData).base64Data = d?.buffer?.toString('base64') ?? ''
                      sendChunk(doc, bf.length).finally(() => {
                        requiredDocs.delete(doc._id)
                        next()
                      })
                    }
                  } else {
                    sendChunk(doc, bf.length).finally(() => {
                      requiredDocs.delete(doc._id)
                      next()
                    })
                  }
                })
              } else {
                next()
              }
              stream.resume() // just auto drain the stream
            })

            const endPromise = new Promise((resolve) => {
              ex.on('finish', () => {
                resolve(null)
              })
            })
            const unzip = createGunzip()
            readStream.pipe(unzip)
            unzip.pipe(ex)

            await endPromise
          }
        } else {
          console.log('domain had no changes', c)
        }
      }
    }

    await sendChunk(undefined, 0)
    if (docsToRemove.length > 0 && merge !== true) {
      console.log('cleanup', docsToRemove.length)
      while (docsToRemove.length > 0) {
        const part = docsToRemove.splice(0, 10000)
        await connection.clean(c, part)
      }
    }
  }

  try {
    for (const c of domains) {
      console.log('loading server changeset for', c)
      let retry = 5
      while (retry > 0) {
        retry--
        try {
          await processDomain(c)
          break
        } catch (err: any) {
          if (retry === 0) {
            console.log('error', err)
          } else {
            console.log('Wait for few seconds for elastic')
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        }
      }
    }
  } finally {
    await connection.close()
  }
}
