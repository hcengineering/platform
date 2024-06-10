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
  type Blob,
  type BlobLookup,
  type CollaborativeDoc,
  type Ref,
  collaborativeDocParse
} from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { ObservableV2 as Observable } from 'lib0/observable'
import { applyUpdate, type Doc as YDoc } from 'yjs'

interface EVENTS {
  synced: (...args: any[]) => void
}

async function fetchContent (_id: Ref<Blob>, doc: YDoc): Promise<boolean> {
  const client = getClient()

  const blob = await client.findOne(core.class.Blob, { _id })
  if (blob !== undefined) {
    const update = await fetchBlobContent(blob as BlobLookup)
    if (update !== undefined) {
      applyUpdate(doc, update)
      return true
    }
  }

  return false
}

async function fetchBlobContent (blob: BlobLookup): Promise<Uint8Array | undefined> {
  try {
    const res = await fetch(blob.downloadUrl)

    if (res.ok) {
      const b = await res.blob()
      const buffer = await b.arrayBuffer()
      return new Uint8Array(buffer)
    }
  } catch (err: any) {
    console.error(err)
  }

  return undefined
}

export class DirectStorageProvider extends Observable<EVENTS> {
  loaded: Promise<void>

  constructor (collaborativeDoc: CollaborativeDoc, doc: YDoc) {
    super()

    this.loaded = new Promise((resolve) => {
      this.on('synced', resolve)
    })

    const { documentId, versionId } = collaborativeDocParse(collaborativeDoc)

    if (versionId === 'HEAD') {
      void fetchContent(documentId, doc).then((synced) => {
        if (synced) {
          this.emit('synced', [this])
        }
      })
    }
  }
}
