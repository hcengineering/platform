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

import { type AttachedData, type Data, type Ref, type TxOperations, generateId } from '@hcengineering/core'

import drive from './plugin'
import type { Drive, File, FileVersion, Folder } from './types'

/** @public */
export async function createFolder (
  client: TxOperations,
  space: Ref<Drive>,
  data: Omit<Data<Folder>, 'path'>
): Promise<Ref<Folder>> {
  let path: Array<Ref<Folder>> = []

  if (data.parent !== drive.ids.Root) {
    const parent = await client.findOne(drive.class.Folder, { _id: data.parent })
    if (parent === undefined) {
      throw new Error('parent not found')
    }
    path = [parent._id, ...parent.path]
  }

  return await client.createDoc(drive.class.Folder, space, { ...data, path })
}

/** @public */
export async function createFile (
  client: TxOperations,
  space: Ref<Drive>,
  parent: Ref<Folder>,
  data: Omit<AttachedData<FileVersion>, 'version'>
): Promise<void> {
  const folder = await client.findOne(drive.class.Folder, { _id: parent })
  const path = folder !== undefined ? [folder._id, ...folder.path] : []

  const version = 1
  const versionId: Ref<FileVersion> = generateId()

  const fileId = await client.createDoc(drive.class.File, space, {
    title: data.title,
    parent,
    path,
    file: versionId,
    version,
    versions: 0
  })

  await client.addCollection(
    drive.class.FileVersion,
    space,
    fileId,
    drive.class.File,
    'versions',
    { ...data, version },
    versionId
  )
}

/** @public */
export async function createFileVersion (
  client: TxOperations,
  file: Ref<File>,
  data: Omit<AttachedData<FileVersion>, 'version'>
): Promise<void> {
  const current = await client.findOne(drive.class.File, { _id: file })
  if (current === undefined) {
    throw new Error('file not found')
  }

  const incResult = await client.update(current, { $inc: { version: 1 } }, true)
  const version = (incResult as any).object.version

  const ops = client.apply(file)

  const versionId = await ops.addCollection(
    drive.class.FileVersion,
    current.space,
    current._id,
    current._class,
    'versions',
    { ...data, version }
  )

  await ops.update(current, { file: versionId })

  await ops.commit()
}

/** @public */
export async function restoreFileVersion (
  client: TxOperations,
  file: Ref<File>,
  version: Ref<FileVersion>
): Promise<void> {
  const currentFile = await client.findOne(drive.class.File, { _id: file })
  if (currentFile === undefined) {
    throw new Error('file not found')
  }

  if (currentFile.file !== version) {
    await client.update(currentFile, { file: version })
  }
}
