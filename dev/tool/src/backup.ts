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
  Ref
} from '@anticrm/core'
import { createWriteStream, existsSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { createGzip } from 'node:zlib'
import { join } from 'path'
import { Pack, pack } from 'tar-stream'
import { gunzipSync, gzipSync } from 'zlib'
import { connect } from './connect'

const dataBlobSize = 100 * 1024 * 1024

export interface Snapshot {
  added: Record<Ref<Doc>, string>
  updated: Record<Ref<Doc>, string>
  removed: Ref<Doc>[]
}
export interface DomainData {
  snapshot?: string
  storage?: string[]

  // Some statistics
  added: number
  updated: number
  removed: number
}
export interface BackupSnapshot {
  // _id => hash of added items.
  domains: Record<Domain, DomainData>
  date: number
}
export interface BackupInfo {
  version: string
  snapshots: BackupSnapshot[]
}

async function loadDigest (
  fileName: string,
  snapshots: BackupSnapshot[],
  domain: Domain
): Promise<Map<Ref<Doc>, string>> {
  const result = new Map<Ref<Doc>, string>()
  for (const s of snapshots) {
    const d = s.domains[domain]
    if (d?.snapshot !== undefined) {
      const dChanges: Snapshot = JSON.parse(gunzipSync(await readFile(join(fileName, d.snapshot))).toString())
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
  }
  return result
}

/**
 * @public
 */
export async function backupWorkspace (transactorUrl: string, dbName: string, fileName: string): Promise<void> {
  const connection = (await connect(transactorUrl, dbName, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient
  try {
    const domains = connection
      .getHierarchy()
      .domains()
      .filter((it) => it !== DOMAIN_TRANSIENT && it !== DOMAIN_MODEL)

    if (!existsSync(fileName)) {
      await mkdir(fileName, { recursive: true })
    }

    let backupInfo: BackupInfo = {
      version: '0.6',
      snapshots: []
    }
    const infoFile = join(fileName, 'backup.json.gz')

    if (existsSync(infoFile)) {
      backupInfo = JSON.parse(gunzipSync(await readFile(infoFile)).toString())
    }

    const snapshot: BackupSnapshot = {
      date: Date.now(),
      domains: {}
    }

    backupInfo.snapshots.push(snapshot)
    let backupIndex = `${backupInfo.snapshots.length}`
    while (backupIndex.length < 6) {
      backupIndex = '0' + backupIndex
    }
    const bdir = join(fileName, backupIndex)
    if (!existsSync(bdir)) {
      await mkdir(bdir, { recursive: true })
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
      const digest = await loadDigest(fileName, backupInfo.snapshots, c)

      let idx: number | undefined

      let _pack: Pack | undefined
      let addedDocuments = 0

      // update digest tar
      while (true) {
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
          const docs = await connection.loadDocs(c, needRetrieve)

          // Chunk data into small pieces
          if (addedDocuments > dataBlobSize && _pack !== undefined) {
            _pack.finalize()
            _pack = undefined
            addedDocuments = 0
          }
          if (_pack === undefined) {
            _pack = pack()
            stIndex++
            const storageFile = join(backupIndex, `${c}-data-${snapshot.date}-${stIndex}.tar.gz`)
            console.log('storing from domain', c, storageFile)
            domainInfo.storage.push(storageFile)
            const dataStream = createWriteStream(join(fileName, storageFile))
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

        if (it.finished) {
          break
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
        await writeFile(join(fileName, domainInfo.snapshot), gzipSync(JSON.stringify(changes)))
        _pack?.finalize()
      }
    }

    await writeFile(infoFile, gzipSync(JSON.stringify(backupInfo, undefined, 2)))
  } finally {
    await connection.close()
  }
}
