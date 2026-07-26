//
// Copyright © 2026 Hardcore Engineering Inc.
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

import attachment, { type Attachment } from '@hcengineering/attachment'
import { type Class, type Client, type Ref, SortingOrder } from '@hcengineering/core'
import drive, { type File as DriveFile, type FileVersion } from '@hcengineering/drive'

import { type LargestFileRow, type LargestFileRowRef, mergeBySizeDesc, topBySize } from './largestFilesLogic'

export { mergeBySizeDesc, topBySize }
export type { LargestFileRow, LargestFileRowRef }

function toAttachmentRow (doc: Attachment): LargestFileRow {
  return {
    id: doc._id,
    source: 'attachment',
    name: doc.name,
    size: doc.size,
    type: doc.type,
    lastModified: doc.lastModified ?? doc.modifiedOn ?? 0,
    owner: doc.modifiedBy,
    space: doc.space,
    ref: {
      _id: doc._id,
      _class: doc._class,
      space: doc.space,
      attachedTo: doc.attachedTo,
      attachedToClass: doc.attachedToClass
    }
  }
}

function toDriveRow (doc: DriveFile, version: FileVersion | undefined): LargestFileRow {
  const size = version?.size ?? 0
  const lastModified = version?.lastModified ?? doc.modifiedOn ?? 0
  return {
    id: doc._id,
    source: 'drive',
    name: doc.title ?? version?.title ?? '',
    size,
    type: version?.type ?? 'application/octet-stream',
    lastModified,
    owner: doc.modifiedBy,
    space: doc.space,
    ref: {
      _id: doc._id,
      _class: doc._class,
      space: doc.space
    }
  }
}

/**
 * Fetch the top `limit` largest user-visible files in the current workspace.
 *
 * @public
 */
export async function fetchLargestFiles (client: Client, limit: number): Promise<LargestFileRow[]> {
  const [attachments, files] = await Promise.all([
    client.findAll<Attachment>(
      attachment.class.Attachment,
      {},
      {
        sort: { size: SortingOrder.Descending },
        limit
      }
    ),
    client.findAll<DriveFile>(
      drive.class.File,
      {},
      {
        limit,
        lookup: { file: drive.class.FileVersion as unknown as Ref<Class<FileVersion>> }
      }
    )
  ])

  // Drive `File` doesn't carry `size`; it lives on the linked FileVersion.
  // After resolving the lookup we sort client-side and trim.
  const driveRows = files
    .map((f) => {
      const version = ((f as any).$lookup?.file as FileVersion | undefined) ?? undefined
      return toDriveRow(f, version)
    })
    .filter((row) => row.size > 0)
    .sort((a, b) => b.size - a.size)
    .slice(0, limit)

  const attachmentRows = attachments.filter((doc) => doc.size > 0).map(toAttachmentRow)

  return topBySize(attachmentRows, driveRows, limit)
}
