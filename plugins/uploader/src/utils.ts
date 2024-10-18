//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { getResource } from '@hcengineering/platform'

import uploader from './plugin'
import type { FileUploadOptions, FileUploadPopupOptions, FileWithPath } from './types'

/** @public */
export async function showFilesUploadPopup (
  options: FileUploadOptions,
  popupOptions: FileUploadPopupOptions
): Promise<void> {
  const fn = await getResource(uploader.function.ShowFilesUploadPopup)
  await fn(options, popupOptions)
}

/** @public */
export async function uploadFile (file: File, options: FileUploadOptions): Promise<void> {
  const fn = await getResource(uploader.function.UploadFiles)
  await fn([file], options)
}

/** @public */
export async function uploadFiles (files: File[] | FileList, options: FileUploadOptions): Promise<void> {
  const fn = await getResource(uploader.function.UploadFiles)
  await fn(files, options)
}

/** @public */
export async function getDataTransferFiles (dataTransfer: DataTransfer): Promise<FileWithPath[]> {
  try {
    const accumulator = []
    const entries = Array.from(dataTransfer.items, getAsEntry)
    for (const entry of entries) {
      if (entry != null) {
        const files = await fromEntry(entry)
        if (Array.isArray(files)) {
          accumulator.push(...files)
        } else {
          accumulator.push(files)
        }
      }
    }
    return accumulator
  } catch {
    return Array.from(dataTransfer.files, (file) => toFileWithPath(file))
  }
}

/** @public */
export function toFileWithPath (file: File, path?: string): FileWithPath {
  const { webkitRelativePath } = file
  if ('relativePath' in file) {
    return file as FileWithPath
  }
  Object.defineProperty(file, 'relativePath', {
    value:
      typeof path === 'string'
        ? path
        : typeof webkitRelativePath === 'string' && webkitRelativePath.length > 0
          ? webkitRelativePath
          : file.name,
    writable: false,
    configurable: false,
    enumerable: true
  })
  return file
}

function getAsEntry (item: DataTransferItem): FileSystemEntry | null | undefined {
  // https://developer.mozilla.org/docs/Web/API/DataTransferItem/webkitGetAsEntry
  return (item as any).getAsEntry === 'function' ? (item as any).getAsEntry() : item.webkitGetAsEntry()
}

async function fromEntry (entry: FileSystemEntry): Promise<FileWithPath | FileWithPath[]> {
  return entry.isDirectory
    ? await fromDirEntry(entry as FileSystemDirectoryEntry)
    : await fromFileEntry(entry as FileSystemFileEntry)
}

async function fromFileEntry (entry: FileSystemFileEntry): Promise<FileWithPath> {
  return await new Promise((resolve, reject) => {
    entry.file((file) => {
      resolve(toFileWithPath(file, entry.fullPath))
    }, reject)
  })
}

async function fromDirEntry (entry: FileSystemDirectoryEntry): Promise<FileWithPath | FileWithPath[]> {
  const reader = entry.createReader()

  return await new Promise((resolve, reject) => {
    const promises: Promise<File | File[]>[] = []

    function readEntries (): void {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      reader.readEntries(async (entries: FileSystemEntry[]) => {
        if (entries.length === 0) {
          try {
            const files = await Promise.all(promises)
            resolve(files.flat())
          } catch (err) {
            reject(err)
          }
        } else {
          // https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryReader/readEntries
          promises.push(...entries.map(fromEntry))
          readEntries()
        }
      }, reject)
    }

    readEntries()
  })
}
