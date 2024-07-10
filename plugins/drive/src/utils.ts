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
import { FileVersion, type Drive, type File, type Folder } from './types'

/** @public */
export async function createFile (
  client: TxOperations,
  space: Ref<Drive>,
  parent: Ref<Folder>,
  data: Omit<Data<FileVersion>, 'version'>
): Promise<void> {
  const folder = await client.findOne(drive.class.Folder, { _id: parent })
  const path = folder !== undefined ? [folder._id, ...folder.path] : []

  const versionId = await client.createDoc(
    drive.class.FileVersion,
    space,
    {
      ...data,
      version: 1
    }
  )

  await client.createDoc(
    drive.class.File,
    space,
    {
      name: data.name,
      parent,
      path,
      sequence: 1,
      version: versionId,
      versions: [versionId]
    }
  )
}

/** @public */
export async function createFileVersion (
  client: TxOperations,
  file: Ref<File>,
  data: Omit<Data<FileVersion>, 'version'>
): Promise<void> {
  const current = await client.findOne(drive.class.File, { _id: file })
  if (current === undefined) {
    throw new Error('file not found')
  }

  const incResult = await client.update(current, { $inc: { sequence: 1 } }, true)
  const sequence = (incResult as any).object.sequence

  const ops = client.apply(file)

  const versionId = await ops.createDoc(
    drive.class.FileVersion,
    current.space,
    {
      ...data,
      version: sequence
    }
  )

  await ops.update(current, {
    version: versionId,
    versions: [...current.versions, versionId]
  })

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

  if (currentFile.version !== version) {
    await client.update(currentFile, {
      version
    })
  }
}
