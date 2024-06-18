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

import type { Class, Doc, Mixin, Ref, SpaceType, SpaceTypeDescriptor, Type } from '@hcengineering/core'
import type { Asset, IntlString, Plugin, Resource as PlatformResource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { Location, ResolvedLocation } from '@hcengineering/ui'
import { Drive, File, FileSize, Folder, Resource } from './types'

export * from './types'

/**
 * @public
 */
export const driveId = 'drive' as Plugin

export const drivePlugin = plugin(driveId, {
  class: {
    Drive: '' as Ref<Class<Drive>>,
    File: '' as Ref<Class<File>>,
    Folder: '' as Ref<Class<Folder>>,
    Resource: '' as Ref<Class<Resource>>,
    TypeFileSize: '' as Ref<Class<Type<FileSize>>>
  },
  mixin: {
    DefaultDriveTypeData: '' as Ref<Mixin<Drive>>
  },
  icon: {
    Drive: '' as Asset,
    Grid: '' as Asset,
    File: '' as Asset,
    Folder: '' as Asset,
    FolderOpen: '' as Asset,
    FolderClosed: '' as Asset,
    Download: '' as Asset
  },
  app: {
    Drive: '' as Ref<Doc>
  },
  ids: {
    Root: '' as Ref<Folder>
  },
  resolver: {
    Location: '' as PlatformResource<(loc: Location) => Promise<ResolvedLocation | undefined>>
  },
  string: {
    Drive: '' as IntlString,
    File: '' as IntlString,
    Folder: '' as IntlString,
    Resource: '' as IntlString
  },
  descriptor: {
    DriveType: '' as Ref<SpaceTypeDescriptor>
  },
  spaceType: {
    DefaultDrive: '' as Ref<SpaceType>
  }
})

export default drivePlugin
