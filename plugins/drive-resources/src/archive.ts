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

import { SortingOrder, type Ref, type Timestamp } from '@hcengineering/core'
import drive, { type FileVersion, type Folder } from '@hcengineering/drive'
import { setPlatformStatus, unknownError } from '@hcengineering/platform'
import { getClient, getFileUrl } from '@hcengineering/presentation'
import { Zip, ZipPassThrough } from 'fflate'

interface ArchiveEntry {
  path: string
  version: FileVersion
  mtime: Timestamp
}

/** Replace path separators so a file title cannot escape its folder inside the archive. */
function sanitizeName (title: string): string {
  return title.replace(/[\\/]/g, '_')
}

/** Resolve duplicate titles within the same folder by appending a numeric suffix. */
function uniquePath (path: string, used: Set<string>): string {
  if (!used.has(path)) {
    used.add(path)
    return path
  }
  const slash = path.lastIndexOf('/')
  const dot = path.lastIndexOf('.')
  const base = dot > slash ? path.slice(0, dot) : path
  const ext = dot > slash ? path.slice(dot) : ''
  for (let index = 1; ; index++) {
    const candidate = `${base} (${index})${ext}`
    if (!used.has(candidate)) {
      used.add(candidate)
      return candidate
    }
  }
}

async function collectFiles (
  folder: Folder,
  prefix: string,
  entries: ArchiveEntry[],
  used: Set<string>,
  visited: Set<Ref<Folder>>
): Promise<void> {
  if (visited.has(folder._id)) {
    return
  }
  visited.add(folder._id)

  const client = getClient()

  const files = await client.findAll(
    drive.class.File,
    { space: folder.space, parent: folder._id },
    { lookup: { file: drive.class.FileVersion }, sort: { title: SortingOrder.Ascending } }
  )
  for (const file of files) {
    const version = file.$lookup?.file
    if (version != null) {
      entries.push({
        path: uniquePath(prefix + sanitizeName(file.title), used),
        version,
        mtime: file.modifiedOn
      })
    }
  }

  const folders = await client.findAll(
    drive.class.Folder,
    { space: folder.space, parent: folder._id },
    { sort: { title: SortingOrder.Ascending } }
  )
  for (const sub of folders) {
    await collectFiles(sub, prefix + sanitizeName(sub.title) + '/', entries, used, visited)
  }
}

async function createArchive (entries: ArchiveEntry[]): Promise<Blob> {
  const chunks: Uint8Array[] = []

  let resolveDone: () => void
  let rejectDone: (err: Error) => void
  const done = new Promise<void>((resolve, reject) => {
    resolveDone = resolve
    rejectDone = reject
  })

  const zip = new Zip((err, chunk, final) => {
    if (err != null) {
      rejectDone(err)
      return
    }
    chunks.push(chunk)
    if (final) {
      resolveDone()
    }
  })

  try {
    for (const entry of entries) {
      // Blobs in Drive are stored already compressed or incompressible more often
      // than not (archives, media, build artifacts), so store them as-is instead
      // of spending CPU on deflate.
      const item = new ZipPassThrough(entry.path)
      item.mtime = entry.mtime
      zip.add(item)

      const response = await fetch(getFileUrl(entry.version.file, entry.version.title))
      if (!response.ok) {
        throw new Error(`Failed to download ${entry.path}: HTTP ${response.status}`)
      }
      item.push(new Uint8Array(await response.arrayBuffer()), true)
    }
    zip.end()
  } catch (err: any) {
    done.catch(() => {})
    zip.terminate()
    throw err
  }

  await done
  return new Blob(chunks, { type: 'application/zip' })
}

/** Download a folder from Drive as a single zip archive preserving the folder structure. */
export async function downloadFolderArchive (doc: Folder | Folder[]): Promise<void> {
  const folders = Array.isArray(doc) ? doc : [doc]
  for (const folder of folders) {
    try {
      const entries: ArchiveEntry[] = []
      await collectFiles(folder, '', entries, new Set(), new Set())
      if (entries.length === 0) {
        continue
      }

      const blob = await createArchive(entries)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.style.display = 'none'
      link.href = url
      link.download = sanitizeName(folder.title) + '.zip'
      link.click()
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 60 * 1000)
    } catch (err: any) {
      await setPlatformStatus(unknownError(err))
    }
  }
}
