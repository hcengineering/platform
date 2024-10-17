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

import { type Class, type Doc, type Ref, type Space, toIdMap } from '@hcengineering/core'
import drive, {
  type Drive,
  type FileVersion,
  type Folder,
  type Resource,
  createFile,
  createFolder,
  DriveEvents
} from '@hcengineering/drive'
import { type Asset, setPlatformStatus, unknownError } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import { type AnySvelteComponent, showPopup } from '@hcengineering/ui'
import {
  type FileUploadCallback,
  getDataTransferFiles,
  showFilesUploadPopup,
  uploadFiles
} from '@hcengineering/uploader'
import { openDoc } from '@hcengineering/view-resources'

import CreateDrive from './components/CreateDrive.svelte'
import CreateFolder from './components/CreateFolder.svelte'
import RenamePopup from './components/RenamePopup.svelte'

import { Analytics } from '@hcengineering/analytics'
import FileTypeAudio from './components/icons/FileTypeAudio.svelte'
import FileTypeImage from './components/icons/FileTypeImage.svelte'
import FileTypePdf from './components/icons/FileTypePdf.svelte'
import FileTypeText from './components/icons/FileTypeText.svelte'
import FileTypeVideo from './components/icons/FileTypeVideo.svelte'

async function navigateToDoc (_id: Ref<Doc>, _class: Ref<Class<Doc>>): Promise<void> {
  const client = getClient()
  const doc = await client.findOne(_class, { _id })
  if (doc !== undefined) {
    void openDoc(client.getHierarchy(), doc)
  }
}

export function formatFileVersion (version: number): string {
  return `v${version}`
}

export async function showCreateFolderPopup (
  space: Ref<Space> | undefined,
  parent: Ref<Folder>,
  open = false
): Promise<void> {
  showPopup(CreateFolder, { space, parent }, 'top', async (id) => {
    if (open && id !== undefined && id !== null) {
      await navigateToDoc(id, drive.class.Folder)
    }
  })
}

export async function showCreateDrivePopup (open = false): Promise<void> {
  showPopup(CreateDrive, {}, 'top', async (id) => {
    if (open && id !== undefined && id !== null) {
      await navigateToDoc(id, drive.class.Folder)
    }
  })
}

export async function showEditDrivePopup (drive: Drive): Promise<void> {
  showPopup(CreateDrive, { drive })
}

export async function showRenameResourcePopup (resource: Resource): Promise<void> {
  showPopup(RenamePopup, { value: resource.title }, undefined, async (res) => {
    if (res != null && res !== resource.title) {
      const client = getClient()
      await client.update(resource, { title: res })
    }
  })
}

export async function moveResources (resources: Resource[], space: Ref<Drive>, parent: Ref<Folder>): Promise<void> {
  const client = getClient()

  const folder = parent !== drive.ids.Root ? await client.findOne(drive.class.Folder, { _id: parent }) : undefined

  const path = folder !== undefined ? [folder._id, ...folder.path] : []

  const folders = resources.filter((p) => p._class === drive.class.Folder).map((p) => p._id)
  const children = await client.findAll(drive.class.Resource, { path: { $in: folders } })
  const byParent = new Map<Ref<Resource>, Resource[]>()
  for (const child of children) {
    const group = byParent.get(child.parent) ?? []
    group.push(child)
    byParent.set(child.parent, group)
  }

  const ops = client.apply(parent)

  for (const resource of resources) {
    await ops.update(resource, { space, parent, path })

    const children = byParent.get(resource._id) ?? []
    for (const child of children) {
      // remove old path and add new path
      const childPath = [...child.path.filter((p) => !resource.path.includes(p)), ...path]
      await ops.update(child, { space, path: childPath })
    }
  }

  await ops.commit()
}

export async function restoreFileVersion (version: FileVersion): Promise<void> {
  const client = getClient()

  const file = await client.findOne(drive.class.File, { _id: version.attachedTo })
  if (file !== undefined && file.file !== version._id) {
    await client.diffUpdate(file, { file: version._id })
  }
}

const fileTypesMap: Record<string, AnySvelteComponent> = {
  'application/pdf': FileTypePdf,
  audio: FileTypeAudio,
  image: FileTypeImage,
  video: FileTypeVideo,
  text: FileTypeText
}

export function getFileTypeIcon (contentType: string): Asset | AnySvelteComponent {
  const type = contentType.split('/', 1)[0]
  return fileTypesMap[type] ?? fileTypesMap[contentType] ?? drive.icon.File
}

export async function resolveParents (object: Resource): Promise<Doc[]> {
  const client = getClient()

  const parents: Doc[] = []

  const path = object.path
  const folders = await client.findAll(drive.class.Resource, { _id: { $in: path } })
  const byId = toIdMap(folders)
  for (const p of path) {
    const parent = byId.get(p)
    if (parent !== undefined) {
      parents.push(parent)
    }
  }

  const root = await client.findOne(drive.class.Drive, { _id: object.space as Ref<Drive> })
  if (root !== undefined) {
    parents.push(root)
  }

  return parents.reverse()
}

export async function uploadFilesToDrive (dt: DataTransfer, space: Ref<Drive>, parent: Ref<Folder>): Promise<void> {
  const files = await getDataTransferFiles(dt)

  const onFileUploaded = await fileUploadCallback(space, parent)

  const target =
    parent !== drive.ids.Root
      ? { objectId: parent, objectClass: drive.class.Folder }
      : { objectId: space, objectClass: drive.class.Drive }

  const options = {
    onFileUploaded,
    showProgress: {
      target
    }
  }

  await uploadFiles(files, options)
}

export async function uploadFilesToDrivePopup (space: Ref<Drive>, parent: Ref<Folder>): Promise<void> {
  const onFileUploaded = await fileUploadCallback(space, parent)

  const target =
    parent !== drive.ids.Root
      ? { objectId: parent, objectClass: drive.class.Folder }
      : { objectId: space, objectClass: drive.class.Drive }

  await showFilesUploadPopup(
    {
      onFileUploaded,
      showProgress: {
        target
      }
    },
    {
      fileManagerSelectionType: 'both'
    }
  )
}

async function fileUploadCallback (space: Ref<Drive>, parent: Ref<Folder>): Promise<FileUploadCallback> {
  const client = getClient()

  const query = parent !== drive.ids.Root ? { space, path: parent } : { space }
  const folders = await client.findAll(drive.class.Folder, query)
  const foldersByName = new Map(folders.map((folder) => [folder.title, folder]))

  const findParent = async (path: string | undefined): Promise<Ref<Folder>> => {
    if (path == null || path.length === 0) {
      return parent
    }

    const segments = path.split('/').filter((p) => p.length > 0)
    if (segments.length <= 1) {
      return parent
    }

    let current = parent
    while (segments.length > 1) {
      const title = segments.shift()
      if (title !== undefined) {
        let folder = foldersByName.get(title)
        if (folder !== undefined) {
          current = folder._id
        } else {
          current = await createFolder(client, space, { title, parent: current })
          folder = await client.findOne(drive.class.Folder, { _id: current })
          if (folder !== undefined) {
            foldersByName.set(folder.title, folder)
          }
        }
      }
    }
    return current
  }

  const callback: FileUploadCallback = async ({ uuid, name, file, path, metadata }) => {
    const folder = await findParent(path)
    try {
      const data = {
        file: uuid,
        size: file.size,
        type: file.type,
        lastModified: file instanceof File ? file.lastModified : Date.now(),
        title: name,
        metadata
      }

      await createFile(client, space, folder, data)
      Analytics.handleEvent(DriveEvents.FileUploaded, { ok: true, type: file.type, size: file.size, name })
    } catch (err) {
      void setPlatformStatus(unknownError(err))
      Analytics.handleEvent(DriveEvents.FileUploaded, { ok: false, name })
    }
  }

  return callback
}
