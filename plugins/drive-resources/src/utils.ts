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

import { toIdMap, type Class, type Doc, type Ref } from '@hcengineering/core'
import drive, { type Drive, type Folder, type Resource } from '@hcengineering/drive'
import { type Asset, setPlatformStatus, unknownError } from '@hcengineering/platform'
import { getClient, getFileMetadata, uploadFile } from '@hcengineering/presentation'
import { type AnySvelteComponent, showPopup } from '@hcengineering/ui'
import { openDoc } from '@hcengineering/view-resources'

import CreateDrive from './components/CreateDrive.svelte'
import CreateFolder from './components/CreateFolder.svelte'
import RenamePopup from './components/RenamePopup.svelte'

import FileTypeAudio from './components/icons/FileTypeAudio.svelte'
import FileTypeImage from './components/icons/FileTypeImage.svelte'
import FileTypeVideo from './components/icons/FileTypeVideo.svelte'
import FileTypePdf from './components/icons/FileTypePdf.svelte'
import FileTypeText from './components/icons/FileTypeText.svelte'

async function navigateToDoc (_id: Ref<Doc>, _class: Ref<Class<Doc>>): Promise<void> {
  const client = getClient()
  const doc = await client.findOne(_class, { _id })
  if (doc !== undefined) {
    void openDoc(client.getHierarchy(), doc)
  }
}

export async function createFolder (space: Ref<Drive> | undefined, parent: Ref<Folder>, open = false): Promise<void> {
  showPopup(CreateFolder, { space, parent }, 'top', async (id) => {
    if (open && id !== undefined && id !== null) {
      await navigateToDoc(id, drive.class.Folder)
    }
  })
}

export async function createDrive (open = false): Promise<void> {
  showPopup(CreateDrive, {}, 'top', async (id) => {
    if (open && id !== undefined && id !== null) {
      await navigateToDoc(id, drive.class.Folder)
    }
  })
}

export async function editDrive (drive: Drive): Promise<void> {
  showPopup(CreateDrive, { drive })
}

export async function createFiles (list: FileList, space: Ref<Drive>, parent: Ref<Folder>): Promise<void> {
  const client = getClient()
  const folder = await client.findOne(drive.class.Folder, { space, _id: parent })

  for (let index = 0; index < list.length; index++) {
    const file = list.item(index)
    if (file !== null) {
      await createFile(file, space, folder)
    }
  }
}

export async function createFile (file: File, space: Ref<Drive>, parent: Folder | undefined): Promise<void> {
  const client = getClient()

  try {
    const uuid = await uploadFile(file)
    const metadata = await getFileMetadata(file, uuid)

    await client.createDoc(drive.class.File, space, {
      name: file.name,
      file: uuid,
      metadata,
      parent: parent?._id ?? drive.ids.Root,
      path: parent !== undefined ? [parent._id, ...parent.path] : []
    })
  } catch (e) {
    void setPlatformStatus(unknownError(e))
  }
}

export async function renameResource (resource: Resource): Promise<void> {
  showPopup(RenamePopup, { value: resource.name, format: 'text' }, undefined, async (res) => {
    if (res != null && res !== resource.name) {
      const client = getClient()
      await client.update(resource, { name: res })
    }
  })
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

  const root = await client.findOne(drive.class.Drive, { _id: object.space })
  if (root !== undefined) {
    parents.push(root)
  }

  return parents.reverse()
}
