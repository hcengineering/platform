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
  BackupClient,
  BlobData,
  Client as CoreClient,
  Doc,
  Domain,
  DOMAIN_MODEL,
  DOMAIN_TRANSIENT,
  Ref,
  WorkspaceId
} from '@hcengineering/core'
import { connect } from '@hcengineering/server-tool'
import { createGzip } from 'node:zlib'
import { join } from 'path'
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
  added: Record<Ref<Doc>, string>
  updated: Record<Ref<Doc>, string>
  removed: Ref<Doc>[]
}

/**
 * @public
 */
export interface DomainData {
  snapshot?: string
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
    if (d?.snapshot !== undefined) {
      const dChanges: Snapshot = JSON.parse(gunzipSync(await storage.loadFile(d.snapshot)).toString())
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
    // Stop if stop date is matched and provided
    if (date !== undefined && date === s.date) {
      break
    }
  }
  return result
}

/**
 * @public
 */
export async function backup (transactorUrl: string, workspaceId: WorkspaceId, storage: BackupStorage): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient
  try {
    const domains = connection
      .getHierarchy()
      .domains()
      .filter((it) => it !== DOMAIN_TRANSIENT && it !== DOMAIN_MODEL)

    let backupInfo: BackupInfo = {
      workspace: workspaceId.name,
      productId: workspaceId.productId,
      version: '0.6',
      snapshots: []
    }
    const infoFile = 'backup.json.gz'

    if (await storage.exists(infoFile)) {
      backupInfo = JSON.parse(gunzipSync(await storage.loadFile(infoFile)).toString())
    }

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
        added: {},
        updated: {},
        removed: []
      }
      let changed = 0
      let stIndex = 0
      const domainInfo: Required<DomainData> = {
        snapshot: join(backupIndex, `${c}-${snapshot.date}.json.gz`),
        storage: [],
        added: 0,
        updated: 0,
        removed: 0
      }

      // Comulative digest
      const digest = await loadDigest(storage, backupInfo.snapshots, c)

      let idx: number | undefined

      let _pack: Pack | undefined
      let addedDocuments = 0

      // update digest tar
      const needRetrieveChunks: Ref<Doc>[][] = []

      // Load all digest from collection.
      while (true) {
        try {
          const it = await connection.loadChunk(c, idx)
          idx = it.idx

          const needRetrieve: Ref<Doc>[] = []

          for (const [k, v] of Object.entries(it.docs)) {
            const kHash = digest.get(k as Ref<Doc>)
            if (kHash !== undefined) {
              digest.delete(k as Ref<Doc>)
              if (kHash !== v) {
                changes.updated[k as Ref<Doc>] = v
                needRetrieve.push(k as Ref<Doc>)
                changed++
              }
            } else {
              changes.added[k as Ref<Doc>] = v
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
            domainInfo.added = Object.keys(changes.added).length
            domainInfo.updated = Object.keys(changes.updated).length
            domainInfo.removed = changes.removed.length
            await storage.writeFile(domainInfo.snapshot, gzipSync(JSON.stringify(changes)))
            // This will allow to retry in case of critical error.
            await storage.writeFile(infoFile, gzipSync(JSON.stringify(backupInfo, undefined, 2)))
          }
        }
        if (_pack === undefined) {
          _pack = pack()
          stIndex++
          const storageFile = join(backupIndex, `${c}-data-${snapshot.date}-${stIndex}.tar.gz`)
          console.log('storing from domain', c, storageFile)
          domainInfo.storage.push(storageFile)
          const dataStream = await storage.write(storageFile)
          const storageZip = createGzip()

          _pack.pipe(storageZip)
          storageZip.pipe(dataStream)
        }

        for (const d of docs) {
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
      changes.removed = Array.from(digest.keys())
      if (changes.removed.length > 0) {
        changed++
      }

      if (changed > 0) {
        snapshot.domains[c] = domainInfo
        domainInfo.added = Object.keys(changes.added).length
        domainInfo.updated = Object.keys(changes.updated).length
        domainInfo.removed = changes.removed.length
        await storage.writeFile(domainInfo.snapshot, gzipSync(JSON.stringify(changes)))
        _pack?.finalize()
        // This will allow to retry in case of critical error.
        await storage.writeFile(infoFile, gzipSync(JSON.stringify(backupInfo, undefined, 2)))
      }
    }

    await storage.writeFile(infoFile, gzipSync(JSON.stringify(backupInfo, undefined, 2)))
  } finally {
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
  date: number
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
  try {
    for (const c of domains) {
      console.log('loading server changeset for', c)
      const changeset = await loadDigest(storage, snapshots, c, date)
      // We need to load full changeset from server
      const serverChangeset = new Map<Ref<Doc>, string>()

      let idx: number | undefined
      let loaded = 0
      let last = 0
      while (true) {
        const it = await connection.loadChunk(c, idx)
        idx = it.idx

        for (const [_id, hash] of Object.entries(it.docs)) {
          serverChangeset.set(_id as Ref<Doc>, hash)
          loaded++
        }
        const mr = Math.round(loaded / 10000)
        if (mr !== last) {
          last = mr
          console.log(' loaded', loaded)
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
          ([it]) =>
            !serverChangeset.has(it) || (serverChangeset.has(it) && serverChangeset.get(it) !== changeset.get(it))
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
      if (docsToRemove.length > 0) {
        console.log('cleanup', docsToRemove.length)
        await connection.clean(c, docsToRemove)
      }
    }
  } finally {
    await connection.close()
  }
}
