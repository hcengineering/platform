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

import { AttachedDoc, Blob, Card, CollectionSize, Ref, Type, TypedSpace } from '@hcengineering/core'

import drive from './plugin'

/** @public */
export function TypeFileVersion (): Type<number> {
  return { _class: drive.class.TypeFileVersion, label: drive.string.FileVersion }
}

/** @public */
export interface Drive extends TypedSpace {}

/** @public */
export interface Resource extends Card {
  title: string
  parent: Ref<Resource>
  path: Ref<Resource>[]

  comments?: number

  // ugly but needed here to get version lookup work for Resource
  file?: Ref<FileVersion>
}

/** @public */
export interface Folder extends Resource {
  parent: Ref<Folder>
  path: Ref<Folder>[]

  file?: undefined
}

/** @public */
export interface File extends Resource {
  parent: Ref<Folder>
  path: Ref<Folder>[]

  file: Ref<FileVersion>
  versions: CollectionSize<FileVersion>
  version: number
}

/** @public */
export interface FileVersion extends AttachedDoc<File, 'versions', Drive> {
  title: string
  file: Ref<Blob>
  size: number
  type: string
  lastModified: number
  metadata?: Record<string, any>
  version: number
}
