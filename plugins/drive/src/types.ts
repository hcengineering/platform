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

import { Blob, Doc, Ref, TypedSpace } from '@hcengineering/core'

/** @public */
export type FileSize = number

/** @public */
export interface Drive extends TypedSpace {}

/** @public */
export interface Resource extends Doc<Drive> {
  name: string
  file?: Ref<Blob>
  preview?: Ref<Blob>

  parent: Ref<Resource>
  path: Ref<Resource>[]

  comments?: number
}

/** @public */
export interface Folder extends Resource {
  parent: Ref<Folder>
  path: Ref<Folder>[]

  file?: undefined
}

/** @public */
export interface File extends Resource {
  file: Ref<Blob>
  metadata?: Record<string, any>

  parent: Ref<Folder>
  path: Ref<Folder>[]
}
