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

import { type Doc, type Ref, type WithLookup } from '@hcengineering/core'
import drive, { type Drive, type File, type Folder } from '@hcengineering/drive'
import { type Resources } from '@hcengineering/platform'
import { getBlobHref } from '@hcengineering/presentation'
import { showPopup, type Location } from '@hcengineering/ui'

import CreateDrive from './components/CreateDrive.svelte'
import DrivePanel from './components/DrivePanel.svelte'
import DrivePresenter from './components/DrivePresenter.svelte'
import DriveSpaceHeader from './components/DriveSpaceHeader.svelte'
import DriveSpacePresenter from './components/DriveSpacePresenter.svelte'
import EditFile from './components/EditFile.svelte'
import EditFolder from './components/EditFolder.svelte'
import FilePanel from './components/FilePanel.svelte'
import FilePresenter from './components/FilePresenter.svelte'
import FileSizePresenter from './components/FileSizePresenter.svelte'
import FolderPanel from './components/FolderPanel.svelte'
import FolderPresenter from './components/FolderPresenter.svelte'
import GridView from './components/GridView.svelte'
import ResourcePresenter from './components/ResourcePresenter.svelte'

import { getDriveLink, getFileLink, getFolderLink, resolveLocation } from './navigation'
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

async function DownloadFile (doc: WithLookup<File> | Array<WithLookup<File>>): Promise<void> {
  const files = Array.isArray(doc) ? doc : [doc]
  for (const file of files) {
    const href = await getBlobHref(file.$lookup?.file, file.file, file.name)
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

async function FileLinkProvider (doc: Doc): Promise<Location> {
  return getFileLink(doc._id as Ref<File>)
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
    EditFile,
    EditFolder,
    FilePanel,
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
    FileLinkProvider,
    FolderLinkProvider,
    CanRenameFile,
    CanRenameFolder
  },
  resolver: {
    Location: resolveLocation
  }
})
