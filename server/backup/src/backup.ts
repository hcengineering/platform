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
  Doc,
  Domain,
  DOMAIN_BLOB,
  DOMAIN_MODEL,
  DOMAIN_MODEL_TX,
  DOMAIN_TRANSIENT,
  DOMAIN_TX,
  MeasureContext,
  PersonUuid,
  Ref,
  SortingOrder,
  toIdMap,
  TxProcessor,
  type Blob,
  type LowLevelStorage,
  type Tx,
  type TxCUD,
  type WorkspaceIds
} from '@hcengineering/core'
import { type Person as GlobalPerson, type SocialId, type AccountDB } from '@hcengineering/account'
import contact, { type Person, type SocialIdentity, type SocialIdentityRef } from '@hcengineering/contact'
import { DOMAIN_CHANNEL, DOMAIN_CONTACT } from '@hcengineering/model-contact'
import { BlobClient } from '@hcengineering/server-client'
import { BackupClientOps, createDummyStorageAdapter, estimateDocSize, type Pipeline } from '@hcengineering/server-core'
import { deepEqual } from 'fast-equals'
import { createReadStream, createWriteStream, mkdtempSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { basename } from 'node:path'
import { PassThrough } from 'node:stream'
import { createGzip } from 'node:zlib'
import { join } from 'path'
import { Pack, pack } from 'tar-stream'
import { gunzipSync, gzipSync } from 'zlib'
import { BackupStorage } from './storage'
import {
  BackupDocId,
  type BackupInfo,
  type BackupResult,
  type BackupSnapshot,
  type DomainData,
  type Snapshot
} from './types'
import {
  checkBackupIntegrity,
  chunkArray,
  compactBackup,
  doTrimHash,
  extendZero,
  getObjectHash,
  isAccountDomain,
  loadDigest,
  rebuildSizeInfo,
  toAccountDomain,
  verifyDocsFromSnapshot,
  writeChanges
} from './utils'
export * from './storage'

const dataBlobSize = 250 * 1024 * 1024
const batchSize = 5000

const defaultLevel = 9

/**
 * @public
 */
export async function backup (
  ctx: MeasureContext,
  pipeline: Pipeline,
  wsIds: WorkspaceIds,
  storage: BackupStorage,
  accountDb: AccountDB,
  options: {
    include?: Set<string>
    skipDomains: string[]
    force: boolean
    timeout: number
    connectTimeout: number
    skipBlobContentTypes: string[]
    blobDownloadLimit: number
    // Return true in case
    isCanceled?: () => boolean
    progress?: (progress: number) => Promise<void>
    token?: string
    fullVerify?: boolean
    keepSnapshots: number
    msg?: Record<string, any>
  } = {
    force: false,
    timeout: 0,
    skipDomains: [],
    connectTimeout: 30000,
    skipBlobContentTypes: ['video/', 'image/', 'audio/'],
    blobDownloadLimit: 5,
    keepSnapshots: 7 * 12
  }
): Promise<BackupResult> {
  const result: BackupResult = {
    result: false,
    dataSize: 0,
    blobsSize: 0,
    backupSize: 0
  }
  const workspaceId = wsIds.uuid
  ctx = ctx.newChild('backup', {}, { span: false })

  let _canceled = false
  const canceled = (): boolean => {
    return _canceled || (options.isCanceled?.() ?? false)
  }

  let timer: any
  let ops = 0

  if (options.timeout > 0) {
    timer = setInterval(() => {
      if (ops === 0) {
        ctx.error('Timeout during backup', { workspace: workspaceId, timeout: options.timeout / 1000 })
        ops = 0
        _canceled = true
      }
    }, options.timeout)
  }

  const st = Date.now()
  const connection = new BackupClientOps(pipeline.context.lowLevelStorage as LowLevelStorage)
  const printEnd = true

  const tmpRoot = mkdtempSync('huly')

  const forcedFullCheck = '4'

  try {
    let backupInfo: BackupInfo = {
      workspace: workspaceId,
      version: '0.6.2',
      snapshots: [],
      domainHashes: {},
      migrations: {
        zeroCheckSize: true, // Assume already checked for new backups
        forcedFullCheck // A force to full recheck.
      },
      dataSize: 0,
      blobsSize: 0,
      backupSize: 0
    }

    const blobInfo: Record<string, [string, number]> = {}
    const affectedPersons = new Set<PersonUuid>()
    const affectedSocialIds = new Set<SocialIdentityRef>()

    // Version 0.6.2, format of digest file is changed to

    const infoFile = 'backup.json.gz'

    const blobInfoFile = 'blob-info.json.gz'

    if (await storage.exists(infoFile)) {
      backupInfo = JSON.parse(gunzipSync(new Uint8Array(await storage.loadFile(infoFile))).toString())
    }
    backupInfo.version = '0.6.2'

    if (backupInfo.migrations == null) {
      backupInfo.migrations = {}
    }

    // Apply verification to backup, since we know it should have broken blobs
    if (backupInfo.migrations.zeroCheckSize == null) {
      await checkBackupIntegrity(ctx, storage)
      if (await storage.exists(infoFile)) {
        backupInfo = JSON.parse(gunzipSync(new Uint8Array(await storage.loadFile(infoFile))).toString())
      }
      if (backupInfo.migrations == null) {
        backupInfo.migrations = {}
      }
      backupInfo.migrations.zeroCheckSize = true
      await storage.writeFile(infoFile, gzipSync(JSON.stringify(backupInfo, undefined, 2), { level: defaultLevel }))
    }

    backupInfo.workspace = workspaceId

    if (backupInfo.domainHashes === undefined) {
      // Migration
      backupInfo.domainHashes = {}
    }

    let fullCheck = options.fullVerify === true

    if (backupInfo.migrations.forcedFullCheck !== forcedFullCheck) {
      // We have forced full check to be performed.
      fullCheck = true
    }
    if (backupInfo.snapshots.length > options.keepSnapshots) {
      // We need to perform compaction
      ctx.warn('Compacting backup')
      await compactBackup(ctx, storage, true, {
        blobLimit: options.blobDownloadLimit,
        skipContentTypes: options.skipBlobContentTypes,
        msg: { workspaceId, url: wsIds.url }
      })
      backupInfo = JSON.parse(gunzipSync(new Uint8Array(await storage.loadFile(infoFile))).toString())

      // Enable full check, just in case.
      fullCheck = true
    }

    let lastTx: Tx | undefined

    ctx.warn('starting backup', { workspace: workspaceId })

    let skipWorkspaceDomains = false
    if (!fullCheck) {
      lastTx = (
        await pipeline.findAll(
          ctx,
          core.class.Tx,
          { objectSpace: { $ne: core.space.Model } },
          { limit: 1, sort: { modifiedOn: SortingOrder.Descending } }
        )
      ).shift()
      if (lastTx !== undefined) {
        if (lastTx._id === backupInfo.lastTxId && !options.force) {
          ctx.info('No transaction changes. Skipping workspace domains backup.', { workspace: workspaceId })
          skipWorkspaceDomains = true
        }
      }
    }

    const blobClient = new BlobClient(pipeline.context.storageAdapter ?? createDummyStorageAdapter(), wsIds)
    const accountDomains = [toAccountDomain('person'), toAccountDomain('socialId')]
    const domains = skipWorkspaceDomains
      ? accountDomains
      : [
          DOMAIN_BLOB,
          DOMAIN_MODEL_TX,
          DOMAIN_TX,
          ...pipeline.context.hierarchy
            .domains()
            .filter(
              (it) =>
                it !== DOMAIN_TRANSIENT &&
                it !== DOMAIN_MODEL &&
                it !== DOMAIN_MODEL_TX &&
                it !== DOMAIN_TX &&
                it !== DOMAIN_BLOB &&
                it !== ('fulltext-blob' as Domain) &&
                !options.skipDomains.includes(it) &&
                (options.include === undefined || options.include.has(it))
            ),
          ...accountDomains
        ]

    ctx.info('domains for dump', { domains: domains.length, workspace: workspaceId, url: wsIds.url })

    if (!skipWorkspaceDomains) {
      backupInfo.lastTxId = '' // Clear until full backup will be complete
    }

    const recheckSizes: string[] = []

    const snapshot: BackupSnapshot = {
      date: Date.now(),
      domains: {},
      stIndex: 0
    }

    // Increment snapshot index
    backupInfo.snapshotsIndex = (backupInfo.snapshotsIndex ?? backupInfo.snapshots.length) + 1
    let backupIndex = `${backupInfo.snapshotsIndex}`
    backupInfo.snapshots.push(snapshot)
    while (backupIndex.length < 6) {
      backupIndex = '0' + backupIndex
    }

    let downloadedMb = 0
    let downloaded = 0

    const printDownloaded = (msg: string, size?: number | null, pending?: number): void => {
      if (size == null || Number.isNaN(size) || !Number.isInteger(size)) {
        return
      }
      ops++
      downloaded += size
      const newDownloadedMb = Math.round(downloaded / (1024 * 1024))
      const newId = Math.round(newDownloadedMb / 10)
      if (downloadedMb !== newId) {
        downloadedMb = newId
        ctx.info('downloaded', {
          msg,
          written: newDownloadedMb,
          pending,
          workspace: workspaceId,
          url: wsIds.url
        })
      }
    }

    type RetriavableChunks = Map<Ref<Doc>, { size?: number, contentType?: string, hash: string }>
    async function loadChangesFromServer (
      ctx: MeasureContext,
      domain: Domain,
      digest: Map<BackupDocId, string>,
      changes: Snapshot,
      same: Map<Ref<Doc>, string>
    ): Promise<{ changed: number, needRetrieveChunks: RetriavableChunks[] }> {
      let idx: number | undefined
      let processed = 0
      let st = Date.now()
      let changed: number = 0
      const needRetrieveChunks: RetriavableChunks[] = []
      const oldHash = new Map<Ref<Doc>, string>()

      function removeFromNeedRetrieve (needRetrieve: RetriavableChunks, id: Ref<Doc>): void {
        if (needRetrieve.delete(id)) {
          processed--
          changed--
        }
        for (const ch of needRetrieveChunks) {
          if (ch.delete(id)) {
            processed--
            changed--
          }
        }
      }

      while (true) {
        try {
          const currentChunk = await ctx.with('loadChunk', {}, () => connection.loadChunk(ctx, domain, idx))
          if (domain === DOMAIN_BLOB) {
            result.blobsSize += currentChunk.size ?? 0
          } else {
            result.dataSize += currentChunk.size ?? 0
          }

          idx = currentChunk.idx
          ops++

          let needRetrieve: RetriavableChunks = new Map()

          for (const { id, hash, contentType, size } of currentChunk.docs) {
            processed++
            if (
              domain === DOMAIN_BLOB &&
              contentType !== undefined &&
              options.skipBlobContentTypes.length > 0 &&
              options.skipBlobContentTypes.some((it) => contentType.includes(it))
            ) {
              blobInfo[id] = [contentType ?? '', size ?? 0]
              continue
            }

            if (domain === DOMAIN_BLOB && size !== undefined && size > options.blobDownloadLimit * 1024 * 1024) {
              blobInfo[id] = [contentType ?? '', size ?? 0]
              continue
            }

            if (Date.now() - st > 2500) {
              ctx.info('processed', {
                processed,
                digest: digest.size,
                time: Date.now() - st,
                workspace: workspaceId,
                url: wsIds.url
              })
              st = Date.now()
            }
            const serverDocHash = doTrimHash(hash) as string
            const currentHash = doTrimHash(digest.get(id as Ref<Doc>) ?? oldHash.get(id as Ref<Doc>))
            if (currentHash !== undefined) {
              const oldD = digest.get(id as Ref<Doc>)
              if (digest.delete(id as Ref<Doc>)) {
                if (oldD !== undefined) {
                  same.set(id as Ref<Doc>, oldD)
                }
                oldHash.set(id as Ref<Doc>, currentHash)
              }
              if (currentHash !== serverDocHash) {
                if (changes.updated.has(id as Ref<Doc>)) {
                  removeFromNeedRetrieve(needRetrieve, id as Ref<Doc>)
                }
                changes.updated.set(id as Ref<Doc>, serverDocHash)
                needRetrieve.set(id as Ref<Doc>, { size, contentType, hash })
                changed++
              } else if (changes.updated.has(id as Ref<Doc>)) {
                // We have same
                changes.updated.delete(id as Ref<Doc>)
                removeFromNeedRetrieve(needRetrieve, id as Ref<Doc>)
                processed -= 1
              }
            } else {
              if (domain === DOMAIN_BLOB && changes.added.has(id as Ref<Doc>)) {
                // We need to clean old need retrieve in case of duplicates.
                removeFromNeedRetrieve(needRetrieve, id as Ref<Doc>)
              }
              changes.added.set(id as Ref<Doc>, serverDocHash)
              needRetrieve.set(id as Ref<Doc>, { size, contentType, hash })
              changed++
            }

            if (needRetrieve.size > batchSize) {
              needRetrieveChunks.push(needRetrieve)
              needRetrieve = new Map()
            }
          }
          if (needRetrieve.size > 0) {
            needRetrieveChunks.push(needRetrieve)
            needRetrieve = new Map()
          }
          if (currentChunk.finished) {
            ctx.info('processed', {
              processed,
              digest: digest.size,
              time: Date.now() - st,
              workspace: workspaceId,
              url: wsIds.url
            })
            await ctx.with('closeChunk', {}, async () => {
              await connection.closeChunk(ctx, idx as number)
            })
            break
          }
        } catch (err: any) {
          ctx.error('failed to load chunks', { error: err })
          if (idx !== undefined) {
            await ctx.with('closeChunk', {}, async () => {
              await connection.closeChunk(ctx, idx as number)
            })
          }
          // Try again
          idx = undefined
          processed = 0
        }
      }
      return { changed, needRetrieveChunks }
    }

    let domainChanges = 0
    async function processDomain (
      ctx: MeasureContext,
      domain: Domain,
      progress: (value: number) => Promise<void>
    ): Promise<void> {
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

      const dHash = await connection.getDomainHash(ctx, domain)
      if (backupInfo.domainHashes[domain] === dHash && !fullCheck) {
        ctx.info('no changes in domain', { domain, workspaceId, url: wsIds.url })
        return
      }
      // Cumulative digest
      const digest = await ctx.with('load-digest', {}, (ctx) =>
        loadDigest(ctx, storage, backupInfo.snapshots, domain, undefined, options.msg)
      )
      const same = new Map<Ref<Doc>, string>()

      let _pack: Pack | undefined
      let _packClose = async (): Promise<void> => {}
      let addedDocuments = (): number => 0

      if (progress !== undefined) {
        await progress(0)
      }
      let { changed, needRetrieveChunks } = await ctx.with('load-chunks', { domain }, (ctx) =>
        loadChangesFromServer(ctx, domain, digest, changes, same)
      )
      processedChanges.removed = Array.from(digest.keys())
      digest.clear()

      if (fullCheck && domain !== DOMAIN_BLOB && same.size > 0) {
        // We need to verify existing documents are correct
        const rsnapshots = Array.from(backupInfo.snapshots).reverse()
        // We need to load all documents locally and from server and compare
        for (const s of rsnapshots) {
          const d = s.domains[domain]
          if (d == null) {
            continue
          }
          let needRetrieve: RetriavableChunks = new Map()
          const { modified, modifiedFiles } = await verifyDocsFromSnapshot(
            ctx,
            domain,
            d,
            s,
            storage,
            same,
            async (docs) => {
              const serverDocs = await connection.loadDocs(
                ctx,
                domain,
                docs.map((it) => it._id)
              )
              const smap = toIdMap(serverDocs)
              for (const localDoc of docs) {
                if (TxProcessor.isExtendsCUD(localDoc._class)) {
                  const tx = localDoc as TxCUD<Doc>
                  if (tx.objectSpace == null) {
                    tx.objectSpace = core.space.Workspace
                  }
                }
                const serverDoc = smap.get(localDoc._id)
                if (serverDoc === undefined) {
                  // We do not have a doc on server already, ignore it.
                } else {
                  const { '%hash%': _h1, ...dData } = localDoc as any
                  const { '%hash%': _h2, ...sData } = serverDoc as any

                  const dsame = deepEqual(dData, sData)
                  if (!dsame) {
                    needRetrieve.set(localDoc._id, { hash: _h1 })
                    changes.updated.set(localDoc._id, same.get(localDoc._id) ?? '')
                    // Docs are not same
                    if (needRetrieve.size > batchSize) {
                      needRetrieveChunks.push(needRetrieve)
                      needRetrieve = new Map()
                    }
                  }
                }
              }
            },
            batchSize
          )
          if (modified) {
            changed++
            recheckSizes.push(...modifiedFiles)
          }
          if (needRetrieve.size > 0) {
            needRetrieveChunks.push(needRetrieve)
            needRetrieve = new Map()
          }
        }
        // We need to retrieve all documents from same not matched
        const sameArray: Ref<Doc>[] = Array.from(same.keys())
        while (sameArray.length > 0) {
          const docs: RetriavableChunks = new Map(sameArray.splice(0, batchSize).map((it) => [it, { hash: '' }]))
          needRetrieveChunks.push(docs)
        }
      } else {
        same.clear()
      }

      if (progress !== undefined) {
        await progress(10)
      }
      const totalChunks = needRetrieveChunks.flatMap((it) => it.size).reduce((p, c) => p + c, 0)
      let processed = 0

      try {
        global.gc?.()
      } catch (err) {}

      let lastSize = 0

      while (needRetrieveChunks.length > 0) {
        if (canceled()) {
          return
        }
        const needRetrieve = needRetrieveChunks.shift() as RetriavableChunks

        if (needRetrieve.size === 0) {
          continue
        }
        ctx.info('<<<< chunk', {
          needRetrieve: needRetrieveChunks.reduce((v, docs) => v + docs.size, 0),
          toLoad: needRetrieve.size,
          workspace: workspaceId,
          url: wsIds.url,
          lastSize: Math.round((lastSize * 100) / (1024 * 1024)) / 100
        })
        let docs: Doc[] = []
        try {
          if (domain === DOMAIN_BLOB) {
            // Try if all info already pressent
            const toRetrieve: Ref<Doc>[] = []
            docs = []
            for (const [id, val] of needRetrieve) {
              if (val.size !== undefined && val.contentType !== undefined) {
                const b: Blob = {
                  _id: id as Ref<Blob>,
                  _class: core.class.Blob,
                  contentType: val.contentType,
                  size: val.size,
                  etag: val.hash,
                  modifiedBy: core.account.System,
                  modifiedOn: Date.now(),
                  provider: '',
                  space: core.space.Workspace,
                  version: null
                }
                docs.push(b)
              } else {
                toRetrieve.push(id)
              }
            }
            if (toRetrieve.length > 0) {
              docs = docs.concat(
                await ctx.with('<<<< load-docs', {}, async () => await connection.loadDocs(ctx, domain, toRetrieve))
              )
            }
          } else {
            docs = await ctx.with(
              '<<<< load-docs',
              {},
              async () => await connection.loadDocs(ctx, domain, Array.from(needRetrieve.keys()))
            )
          }
          lastSize = docs.reduce((p, it) => p + estimateDocSize(it), 0)
          if (docs.length !== needRetrieve.size) {
            ctx.error('failed to retrieve all documents', {
              docsLen: docs.length,
              needRetrieve: needRetrieve.size
            })
          }
          ops++
        } catch (err: any) {
          ctx.error('error loading docs', { domain, err, workspace: workspaceId })
          // Put back.
          needRetrieveChunks.push(needRetrieve)
          continue
        }

        while (docs.length > 0) {
          // Chunk data into small pieces
          if (addedDocuments() > dataBlobSize && _pack !== undefined) {
            await _packClose()

            if (changed > 0) {
              try {
                global.gc?.()
              } catch (err) {}
              snapshot.domains[domain] = domainInfo
              domainInfo.added += processedChanges.added.size
              domainInfo.updated += processedChanges.updated.size
              domainInfo.removed += processedChanges.removed.length

              snapshotIndex++
              const snapshotFile = join(backupIndex, `${domain}-${snapshot.date}-${extendZero(snapshotIndex)}.snp.gz`)
              domainInfo.snapshots = [...(domainInfo.snapshots ?? []), snapshotFile]
              await writeChanges(storage, snapshotFile, processedChanges)

              processedChanges.added.clear()
              processedChanges.removed = []
              processedChanges.updated.clear()
              domainChanges++
              await storage.writeFile(
                infoFile,
                gzipSync(JSON.stringify(backupInfo, undefined, 2), { level: defaultLevel, memLevel: 9 })
              )
            }
          }
          if (_pack === undefined) {
            _pack = pack()
            stIndex++
            const storageFile = join(backupIndex, `${domain}-data-${snapshot.date}-${extendZero(stIndex)}.tar.gz`)
            domainInfo.storage = [...(domainInfo.storage ?? []), storageFile]
            const tmpFile = join(tmpRoot, basename(storageFile) + '.tmp')
            const tempFile = createWriteStream(tmpFile)
            // const dataStream = await storage.write(storageFile)

            const sizePass = new PassThrough()
            let sz = 0
            sizePass._transform = (chunk, encoding, cb) => {
              // No transformation, just pass through data
              sz += chunk.length
              sizePass.push(chunk)
              cb()
            }

            sizePass.pipe(tempFile)

            const storageZip = createGzip({ level: defaultLevel, memLevel: 9 })
            addedDocuments = () => sz
            _pack.pipe(storageZip)
            storageZip.pipe(sizePass)

            _packClose = async () => {
              await new Promise<void>((resolve) => {
                tempFile.on('close', () => {
                  resolve()
                })
                _pack?.finalize()
              })

              // We need to upload file to storage
              ctx.info('>>>> upload pack', { storageFile, size: sz, url: wsIds.url, workspace: workspaceId })
              await storage.writeFile(storageFile, createReadStream(tmpFile))
              await rm(tmpFile)

              _pack = undefined
            }
          }
          if (canceled()) {
            return
          }
          const d = docs.shift()
          if (d === undefined) {
            break
          }

          function processChanges (d: Doc, error: boolean = false): void {
            processed++
            // Move processed document to processedChanges
            if (changes.added.has(d._id)) {
              if (!error) {
                processedChanges.added.set(d._id, changes.added.get(d._id) ?? '')
              }
              changes.added.delete(d._id)
            } else {
              if (!error) {
                processedChanges.updated.set(d._id, changes.updated.get(d._id) ?? '')
              }
              changes.updated.delete(d._id)
            }
          }
          if (d._class === core.class.Blob) {
            const blob = d as Blob
            const descrJson = JSON.stringify(d)

            if (blob.size > options.blobDownloadLimit * 1024 * 1024) {
              ctx.info('skip blob download, limit excheed', {
                blob: blob._id,
                provider: blob.provider,
                size: Math.round(blob.size / (1024 * 1024)),
                limit: options.blobDownloadLimit,
                workspace: workspaceId,
                url: wsIds.url
              })
              processChanges(d, true)
              if (progress !== undefined) {
                await progress(10 + (processed / totalChunks) * 90)
              }
              continue
            }

            if (
              options.skipBlobContentTypes.length > 0 &&
              options.skipBlobContentTypes.some((it) => blob.contentType.includes(it))
            ) {
              processChanges(d, true)
              if (progress !== undefined) {
                await progress(10 + (processed / totalChunks) * 90)
              }
              continue
            }

            let blobFiled = false

            printDownloaded(
              '',
              descrJson.length,
              needRetrieveChunks.reduce((v, docs) => v + docs.size, 0) + docs.length
            )
            try {
              const buffers: Buffer[] = []
              await blobClient.writeTo(ctx, blob._id, blob.size, {
                write (buffer, cb) {
                  buffers.push(buffer)
                  cb()
                },
                end: (cb: () => void) => {
                  cb()
                }
              })

              const finalBuffer = Buffer.concat(buffers as any)
              if (finalBuffer.length !== blob.size) {
                ctx.error('download blob size mismatch', {
                  _id: blob._id,
                  contentType: blob.contentType,
                  size: blob.size,
                  bufferSize: finalBuffer.length,
                  provider: blob.provider
                })
              }
              await new Promise<void>((resolve, reject) => {
                _pack?.entry({ name: d._id + '.json' }, descrJson, (err) => {
                  if (err != null) reject(err)
                  resolve()
                })
              })
              await new Promise<void>((resolve, reject) => {
                _pack?.entry({ name: d._id, size: finalBuffer.length }, finalBuffer, (err) => {
                  if (err != null) {
                    reject(err)
                  }
                  resolve()
                })
              })

              printDownloaded('', blob.size, needRetrieveChunks.reduce((v, docs) => v + docs.size, 0) + docs.length)
            } catch (err: any) {
              if (err.message?.startsWith('No file for') === true) {
                ctx.error('failed to download blob', { message: err.message })
              } else {
                ctx.error('failed to download blob', { err })
              }
              blobFiled = true
            }

            processChanges(d, blobFiled)
          } else {
            // Remember changes of Persons and SocialIdentities
            // to process them later in account domains
            if (domain === DOMAIN_CONTACT && d._class === contact.class.Person) {
              const person = d as Person
              if (person.personUuid !== undefined) {
                affectedPersons.add(person.personUuid)
              }
            } else if (domain === DOMAIN_CHANNEL && d._class === contact.class.SocialIdentity) {
              const sid = d as SocialIdentity
              affectedSocialIds.add(sid._id)
            }

            const data = JSON.stringify(d)
            await new Promise<void>((resolve, reject) => {
              _pack?.entry({ name: d._id + '.json' }, data, function (err) {
                if (err != null) reject(err)
                resolve()
              })
            })
            processChanges(d)
            printDownloaded('', data.length, needRetrieveChunks.reduce((v, docs) => v + docs.size, 0) + docs.length)
          }
        }
      }

      if (processedChanges.removed.length > 0) {
        changed++
      }

      if (changed > 0 || (domain !== DOMAIN_BLOB && backupInfo.domainHashes[domain] !== dHash)) {
        // Store domain hash, to be used on next time.
        backupInfo.domainHashes[domain] = dHash

        domainInfo.added += processedChanges.added.size
        domainInfo.updated += processedChanges.updated.size
        domainInfo.removed += processedChanges.removed.length
        if (domainInfo.added + domainInfo.updated + domainInfo.removed > 0) {
          snapshot.domains[domain] = domainInfo

          snapshotIndex++
          const snapshotFile = join(backupIndex, `${domain}-${snapshot.date}-${extendZero(snapshotIndex)}.snp.gz`)
          domainInfo.snapshots = [...(domainInfo.snapshots ?? []), snapshotFile]
          await writeChanges(storage, snapshotFile, processedChanges)
        }

        processedChanges.added.clear()
        processedChanges.removed = []
        processedChanges.updated.clear()
        await _packClose()
        domainChanges++
        // This will allow to retry in case of critical error.
        await storage.writeFile(infoFile, gzipSync(JSON.stringify(backupInfo, undefined, 2), { level: defaultLevel }))
      }
    }

    async function processAccountDomain (
      ctx: MeasureContext,
      domain: Domain,
      progress: (value: number) => Promise<void>
    ): Promise<void> {
      const isPersonDomain = domain === toAccountDomain('person')
      let collection: 'person' | 'socialId'
      let key: 'uuid' | '_id'
      let getObjKey: (obj: any) => string
      let affectedObjects: Set<BackupDocId>

      if (isPersonDomain) {
        collection = 'person'
        key = 'uuid'
        getObjKey = (obj: GlobalPerson) => obj.uuid

        if (fullCheck) {
          let idx: number | undefined
          while (true) {
            const currentChunk = await ctx.with('loadChunk', {}, () => connection.loadChunk(ctx, DOMAIN_CONTACT, idx))
            idx = currentChunk.idx
            const chuckDocs = await connection.loadDocs(
              ctx,
              DOMAIN_CONTACT,
              currentChunk.docs.map((it) => it.id) as Ref<Doc>[]
            )
            for (const doc of chuckDocs) {
              if (doc._class === contact.class.Person) {
                const person = doc as Person
                if (person.personUuid !== undefined) {
                  affectedPersons.add(person.personUuid)
                }
              }
            }
            if (currentChunk.finished) {
              break
            }
          }
        }
        affectedObjects = affectedPersons
      } else {
        collection = 'socialId'
        key = '_id'
        getObjKey = (obj: SocialId) => obj._id

        if (fullCheck) {
          let idx: number | undefined
          while (true) {
            const currentChunk = await ctx.with('loadChunk', {}, () => connection.loadChunk(ctx, DOMAIN_CHANNEL, idx))
            idx = currentChunk.idx
            const chuckDocs = await connection.loadDocs(
              ctx,
              DOMAIN_CHANNEL,
              currentChunk.docs.map((it) => it.id) as Ref<Doc>[]
            )
            for (const doc of chuckDocs) {
              if (doc._class === contact.class.SocialIdentity) {
                const sid = doc as SocialIdentity
                affectedSocialIds.add(sid._id)
              }
            }
            if (currentChunk.finished) {
              break
            }
          }
        }
        affectedObjects = affectedSocialIds
      }

      const processedChanges: Snapshot = {
        added: new Map(),
        updated: new Map(),
        removed: []
      }

      let stIndex = 0
      let snapshotIndex = 0
      const domainInfo: DomainData = {
        snapshots: [],
        storage: [],
        added: 0,
        updated: 0,
        removed: 0
      }

      // Load cumulative digest from existing snapshots
      const digest = await ctx.with('load-digest', {}, (ctx) =>
        loadDigest(ctx, storage, backupInfo.snapshots, domain, undefined, options.msg)
      )

      let _pack: Pack | undefined
      let _packClose = async (): Promise<void> => {}
      let addedDocuments = (): number => 0
      let changed = false

      if (progress !== undefined) {
        await progress(0)
      }

      // 1. We need to include global records based on persons/socialIdentities info which are missing in digest
      // 2. We need to check updates for all records present in digest
      const batchSize = 1000
      const toLoad = new Set([...digest.keys(), ...affectedObjects]) as Set<PersonUuid>
      if (toLoad.size === 0) {
        ctx.info('No records updates')
        return
      }

      const toLoadSorted = Array.from(toLoad).sort()
      const chunks = chunkArray(toLoadSorted, batchSize)
      for (const chunk of chunks) {
        const objs = await accountDb[collection].find({
          [key]: { $in: chunk, $gte: chunk[0], $lte: chunk[chunk.length - 1] }
        })
        for (const obj of objs) {
          // check if existing package need to be dumped
          if (addedDocuments() > dataBlobSize && _pack !== undefined) {
            await _packClose()

            try {
              global.gc?.()
            } catch (err) {}

            snapshot.domains[domain] = domainInfo
            domainInfo.added += processedChanges.added.size
            domainInfo.updated += processedChanges.updated.size
            domainInfo.removed += processedChanges.removed.length

            snapshotIndex++
            const snapshotFile = join(backupIndex, `${domain}-${snapshot.date}-${extendZero(snapshotIndex)}.snp.gz`)
            domainInfo.snapshots = [...(domainInfo.snapshots ?? []), snapshotFile]
            await writeChanges(storage, snapshotFile, processedChanges)

            processedChanges.added.clear()
            processedChanges.removed = []
            processedChanges.updated.clear()
            changed = false
            domainChanges++

            await storage.writeFile(
              infoFile,
              gzipSync(JSON.stringify(backupInfo, undefined, 2), { level: defaultLevel, memLevel: 9 })
            )
          }

          // prepare new snapshot package if needed
          if (_pack === undefined) {
            _pack = pack()
            stIndex++
            const storageFile = join(backupIndex, `${domain}-data-${snapshot.date}-${extendZero(stIndex)}.tar.gz`)
            domainInfo.storage = [...(domainInfo.storage ?? []), storageFile]
            const tmpFile = join(tmpRoot, basename(storageFile) + '.tmp')
            const tempFile = createWriteStream(tmpFile)
            // const dataStream = await storage.write(storageFile)

            const sizePass = new PassThrough()
            let sz = 0
            sizePass._transform = (chunk, encoding, cb) => {
              // No transformation, just pass through data
              sz += chunk.length
              sizePass.push(chunk)
              cb()
            }

            sizePass.pipe(tempFile)

            const storageZip = createGzip({ level: defaultLevel, memLevel: 9 })
            addedDocuments = () => sz
            _pack.pipe(storageZip)
            storageZip.pipe(sizePass)

            _packClose = async () => {
              await new Promise<void>((resolve) => {
                tempFile.on('close', () => {
                  resolve()
                })
                _pack?.finalize()
              })

              // We need to upload file to storage
              ctx.info('>>>> upload pack', { storageFile, size: sz, url: wsIds.url, workspace: workspaceId })
              await storage.writeFile(storageFile, createReadStream(tmpFile))
              await rm(tmpFile)

              _pack = undefined
            }
          }

          // return early if canceled
          if (canceled()) {
            return
          }

          // add new document file to the snapshot package if needed
          const newHash = getObjectHash(obj)
          const objKey = getObjKey(obj)
          let include = false

          if (!digest.has(objKey)) {
            // new person
            processedChanges.added.set(objKey, newHash)
            include = true
          } else {
            const oldHash = digest.get(objKey)

            if (oldHash !== newHash) {
              // updated person
              processedChanges.updated.set(objKey, newHash)
              include = true
            }
          }

          if (include) {
            const data = JSON.stringify(obj)
            await new Promise<void>((resolve, reject) => {
              _pack?.entry({ name: getObjKey(obj) + '.json' }, data, function (err) {
                if (err != null) reject(err)
                resolve()
              })
            })
            changed = true
          }
        }
      }

      if (changed && _pack !== undefined) {
        domainInfo.added += processedChanges.added.size
        domainInfo.updated += processedChanges.updated.size
        domainInfo.removed += processedChanges.removed.length
        if (domainInfo.added + domainInfo.updated + domainInfo.removed > 0) {
          snapshot.domains[domain] = domainInfo

          snapshotIndex++
          const snapshotFile = join(backupIndex, `${domain}-${snapshot.date}-${extendZero(snapshotIndex)}.snp.gz`)
          domainInfo.snapshots = [...(domainInfo.snapshots ?? []), snapshotFile]
          await writeChanges(storage, snapshotFile, processedChanges)
        }

        processedChanges.added.clear()
        processedChanges.removed = []
        processedChanges.updated.clear()
        changed = false
        await _packClose()
        domainChanges++
        // This will allow to retry in case of critical error.
        await storage.writeFile(infoFile, gzipSync(JSON.stringify(backupInfo, undefined, 2), { level: defaultLevel }))
      }
    }

    let domainProgress = 0

    for (const domain of domains) {
      if (canceled()) {
        break
      }
      const oldUsed = process.memoryUsage().heapUsed
      try {
        global.gc?.()
      } catch (err) {}

      const mm = {
        old: Math.round(oldUsed / (1024 * 1024)),
        current: Math.round(process.memoryUsage().heapUsed / (1024 * 1024))
      }
      if (mm.old > mm.current + mm.current / 10) {
        ctx.info('memory-stats', { ...mm, workspace: workspaceId })
      }
      const doProcessDomain = isAccountDomain(domain) ? processAccountDomain : processDomain
      await ctx.with('process-domain', { domain }, async (ctx) => {
        await doProcessDomain(
          ctx,
          domain,
          (value) =>
            options.progress?.(Math.round(((domainProgress + value / 100) / domains.length) * 100)) ?? Promise.resolve()
        )
      })
      domainProgress++
      await options.progress?.(Math.round((domainProgress / domains.length) * 10000) / 100)
    }

    result.result = true

    if (!canceled() && domainChanges > 0) {
      backupInfo.lastTxId = lastTx?._id ?? '0' // We could store last tx, since full backup is complete
      backupInfo.migrations.forcedFullCheck = forcedFullCheck
      backupInfo.dataSize = result.dataSize
      backupInfo.blobsSize = result.blobsSize
      backupInfo.backupSize = result.backupSize
      await storage.writeFile(infoFile, gzipSync(JSON.stringify(backupInfo, undefined, 2), { level: defaultLevel }))

      await storage.writeFile(blobInfoFile, gzipSync(JSON.stringify(blobInfo), { level: defaultLevel }))

      await rebuildSizeInfo(storage, recheckSizes, ctx, result, backupInfo, infoFile, blobInfoFile)

      // Same one more time with recalculated sizes
      await storage.writeFile(infoFile, gzipSync(JSON.stringify(backupInfo, undefined, 2), { level: defaultLevel }))
    }

    return result
  } catch (err: any) {
    ctx.error('backup error', { err, workspace: workspaceId })
    return result
  } finally {
    await rm(tmpRoot, { recursive: true })
    if (printEnd) {
      ctx.info('end backup', { workspace: workspaceId, totalTime: Date.now() - st })
    }
    ctx.end()
    if (options.timeout !== -1) {
      clearInterval(timer)
    }
  }
}
