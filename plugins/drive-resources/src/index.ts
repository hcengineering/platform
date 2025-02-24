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

import type { Class, Client, Doc, DocumentQuery, Ref, RelatedDocument, WithLookup } from '@hcengineering/core'
import drive, { type Drive, type File, type FileVersion, type Folder } from '@hcengineering/drive'
import { type Resources } from '@hcengineering/platform'
import { type ObjectSearchResult, getFileUrl } from '@hcengineering/presentation'
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
import FileSearchItem from './components/FileSearchItem.svelte'
import FileSizePresenter from './components/FileSizePresenter.svelte'
import FileVersionPresenter from './components/FileVersionPresenter.svelte'
import FileVersionVersionPresenter from './components/FileVersionVersionPresenter.svelte'
import FolderPanel from './components/FolderPanel.svelte'
import FolderPresenter from './components/FolderPresenter.svelte'
import FolderSearchItem from './components/FolderSearchItem.svelte'
import GridView from './components/GridView.svelte'
import MoveResource from './components/MoveResource.svelte'
import ResourcePresenter from './components/ResourcePresenter.svelte'

import { getDriveLink, getFileLink, getFolderLink, resolveLocation } from './navigation'
import { restoreFileVersion, showCreateFolderPopup, showRenameResourcePopup } from './utils'

const toFileObjectSearchResult = (e: WithLookup<File>): ObjectSearchResult => ({
  doc: e,
  title: e.title,
  icon: drive.icon.File,
  component: FileSearchItem
})

const toFolderObjectSearchResult = (e: WithLookup<Folder>): ObjectSearchResult => ({
  doc: e,
  title: e.title,
  icon: drive.icon.Folder,
  component: FolderSearchItem
})

async function queryFile (
  _class: Ref<Class<File>>,
  client: Client,
  search: string,
  filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
): Promise<ObjectSearchResult[]> {
  const q: DocumentQuery<File> = { title: { $like: `%${search}%` } }
  if (filter?.in !== undefined || filter?.nin !== undefined) {
    q._id = {}
    if (filter.in !== undefined) {
      q._id.$in = filter.in?.map((it) => it._id as Ref<File>)
    }
    if (filter.nin !== undefined) {
      q._id.$nin = filter.nin?.map((it) => it._id as Ref<File>)
    }
  }
  return (await client.findAll(_class, q, { limit: 200 })).map(toFileObjectSearchResult)
}

async function queryFolder (
  _class: Ref<Class<Folder>>,
  client: Client,
  search: string,
  filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
): Promise<ObjectSearchResult[]> {
  const q: DocumentQuery<Folder> = { title: { $like: `%${search}%` } }
  if (filter?.in !== undefined || filter?.nin !== undefined) {
    q._id = {}
    if (filter.in !== undefined) {
      q._id.$in = filter.in?.map((it) => it._id as Ref<Folder>)
    }
    if (filter.nin !== undefined) {
      q._id.$nin = filter.nin?.map((it) => it._id as Ref<Folder>)
    }
  }
  return (await client.findAll(_class, q, { limit: 200 })).map(toFolderObjectSearchResult)
}

async function CreateRootFolder (doc: Drive): Promise<void> {
  await showCreateFolderPopup(doc._id, drive.ids.Root)
}

async function CreateChildFolder (doc: Folder): Promise<void> {
  await showCreateFolderPopup(doc.space, doc._id)
}

async function EditDrive (drive: Drive): Promise<void> {
  showPopup(CreateDrive, { drive })
}

async function DownloadFile (doc: WithLookup<File> | Array<WithLookup<File>>): Promise<void> {
  const files = Array.isArray(doc) ? doc : [doc]
  for (const file of files) {
    const version = file.$lookup?.file
    if (version != null) {
      const href = getFileUrl(version.file, version.title)
      const link = document.createElement('a')
      link.style.display = 'none'
      link.target = '_blank'
      link.href = href
      link.download = file.title
      link.click()
    }
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
    await showRenameResourcePopup(doc)
  }
}

async function RenameFolder (doc: Folder | Folder[]): Promise<void> {
  if (!Array.isArray(doc)) {
    await showRenameResourcePopup(doc)
  }
}

async function RestoreFileVersion (doc: FileVersion | FileVersion[]): Promise<void> {
  if (!Array.isArray(doc)) {
    await restoreFileVersion(doc)
  }
}

export async function CanRenameFile (doc: File | File[] | undefined): Promise<boolean> {
  return doc !== undefined && !Array.isArray(doc)
}

export async function CanRenameFolder (doc: Folder | Folder[] | undefined): Promise<boolean> {
  return doc !== undefined && !Array.isArray(doc)
}

export async function CanDeleteFileVersion (
  doc: WithLookup<FileVersion> | Array<WithLookup<FileVersion>> | undefined
): Promise<boolean> {
  if (doc === undefined) {
    return false
  }

  const docs = Array.isArray(doc) ? doc : [doc]
  return docs.every((p) => p.$lookup?.attachedTo !== undefined && p.$lookup?.attachedTo.file !== p._id)
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
    FileVersionPresenter,
    FileVersionVersionPresenter,
    FolderPanel,
    FolderPresenter,
    GridView,
    MoveResource,
    ResourcePresenter
  },
  actionImpl: {
    CreateChildFolder,
    CreateRootFolder,
    EditDrive,
    DownloadFile,
    RenameFile,
    RenameFolder,
    RestoreFileVersion
  },
  completion: {
    FileQuery: async (client: Client, query: string, filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }) =>
      await queryFile(drive.class.File, client, query, filter),
    FolderQuery: async (client: Client, query: string, filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }) =>
      await queryFolder(drive.class.Folder, client, query, filter)
  },
  function: {
    DriveLinkProvider,
    FileLinkProvider,
    FolderLinkProvider,
    CanRenameFile,
    CanRenameFolder,
    CanDeleteFileVersion
  },
  resolver: {
    Location: resolveLocation
  }
})
