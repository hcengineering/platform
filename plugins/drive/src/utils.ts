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

import type { Data, Ref, TxOperations } from '@hcengineering/core'

import drive from './plugin'
import { FileVersion, type Drive, type File } from './types'

/** @public */
export async function createFile (
  client: TxOperations,
  space: Ref<Drive>,
  data: Omit<Data<File>, 'path' | 'version' | 'versions'>
): Promise<void> {
  const version = 1

  const parent = await client.findOne(drive.class.Folder, { _id: data.parent })
  const path = parent !== undefined ? [parent._id, ...parent.path] : []

  const fileId = await client.createDoc(
    drive.class.File,
    space,
    {
      ...data,
      path,
      version,
      versions: 0
    }
  )

  await client.addCollection(
    drive.class.FileVersion,
    space,
    fileId,
    drive.class.File,
    'versions',
    {
      version,
      file: data.file,
      metadata: data.metadata
    }
  )
}

/** @public */
export async function createFileVersion (
  client: TxOperations,
  file: Ref<File>,
  data: Pick<Data<File>, 'file' | 'metadata'>
): Promise<void> {
  const current = await client.findOne(drive.class.File, { _id: file })
  if (current === undefined) {
    throw new Error('file not found')
  }

  const ops = client.apply(file)

  const incResult = await client.update(current, { $inc: { version: 1 } }, true)
  const version = (incResult as any).object.version

  await client.update(current, { ...data })

  await client.addCollection(
    drive.class.FileVersion,
    current.space,
    current._id,
    drive.class.File,
    'versions',
    {
      version,
      file: data.file,
      metadata: data.metadata
    }
  )

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

  const currentVersion = await client.findOne(drive.class.FileVersion, { _id: version })
  if (currentVersion === undefined) {
    throw new Error('file version not found')
  }

  if (currentFile.version !== currentVersion.version) {
    await createFileVersion(client, file, { file: currentVersion.file, metadata: currentVersion.metadata })
  }
}
