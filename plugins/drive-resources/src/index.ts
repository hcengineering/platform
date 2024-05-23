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

import { type Doc, type Ref } from '@hcengineering/core'
import drive, { type Drive, type File, type Folder } from '@hcengineering/drive'
import { type Resources } from '@hcengineering/platform'
import { getFileUrl } from '@hcengineering/presentation'
import { type Location, showPopup } from '@hcengineering/ui'

import CreateDrive from './components/CreateDrive.svelte'
import DrivePanel from './components/DrivePanel.svelte'
import DriveSpaceHeader from './components/DriveSpaceHeader.svelte'
import DriveSpacePresenter from './components/DriveSpacePresenter.svelte'
import DrivePresenter from './components/DrivePresenter.svelte'
import EditFolder from './components/EditFolder.svelte'
import FilePresenter from './components/FilePresenter.svelte'
import FileSizePresenter from './components/FileSizePresenter.svelte'
import FolderPanel from './components/FolderPanel.svelte'
import FolderPresenter from './components/FolderPresenter.svelte'
import GridView from './components/GridView.svelte'
import ResourcePresenter from './components/ResourcePresenter.svelte'

import { getDriveLink, getFolderLink, resolveLocation } from './navigation'
import { createFolder, renameResource } from './utils'

async function CreateRootFolder (doc: Drive): Promise<void> {
  await createFolder(doc._id, drive.ids.Root)
}

async function CreateChildFolder (doc: Folder): Promise<void> {
  await createFolder(doc.space, doc._id)
}

async function EditDrive (drive: Drive): Promise<void> {
  showPopup(CreateDrive, { drive })
}

async function DownloadFile (doc: File | File[]): Promise<void> {
  const files = Array.isArray(doc) ? doc : [doc]
  for (const file of files) {
    const href = getFileUrl(file.file, 'full', file.name)
    const link = document.createElement('a')
    link.style.display = 'none'
    link.target = '_blank'
    link.href = href
    link.download = file.name
    link.click()
  }
}

async function DriveLinkProvider (doc: Doc): Promise<Location> {
  return getDriveLink(doc._id as Ref<Drive>)
}

async function FolderLinkProvider (doc: Doc): Promise<Location> {
  return getFolderLink(doc._id as Ref<Folder>)
}

async function RenameFile (doc: File | File[]): Promise<void> {
  if (!Array.isArray(doc)) {
    await renameResource(doc)
  }
}

async function RenameFolder (doc: Folder | Folder[]): Promise<void> {
  if (!Array.isArray(doc)) {
    await renameResource(doc)
  }
}

export async function CanRenameFile (doc: File | File[] | undefined): Promise<boolean> {
  return doc !== undefined && !Array.isArray(doc)
}

export async function CanRenameFolder (doc: Folder | Folder[] | undefined): Promise<boolean> {
  return doc !== undefined && !Array.isArray(doc)
}

export default async (): Promise<Resources> => ({
  component: {
    CreateDrive,
    DrivePanel,
    DriveSpaceHeader,
    DriveSpacePresenter,
    DrivePresenter,
    EditFolder,
    FilePresenter,
    FileSizePresenter,
    FolderPanel,
    FolderPresenter,
    GridView,
    ResourcePresenter
  },
  actionImpl: {
    CreateChildFolder,
    CreateRootFolder,
    EditDrive,
    DownloadFile,
    RenameFile,
    RenameFolder
  },
  function: {
    DriveLinkProvider,
    FolderLinkProvider,
    CanRenameFile,
    CanRenameFolder
  },
  resolver: {
    Location: resolveLocation
  }
})
