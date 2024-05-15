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

import { Doc, Ref, TypedSpace } from '@hcengineering/core'
import { Preference } from '@hcengineering/preference'

/** @public */
export interface Drive extends TypedSpace {}

/** @public */
export interface Folder extends Doc<Drive> {
  name: string
  parent: Ref<Folder>
  path: Ref<Folder>[]
}

/** @public */
export interface File extends Doc<Drive> {
  name: string

  parent: Ref<Folder>
  path: Ref<Folder>[]

  file: string
  size: number
  type: string
}

/** @public */
export interface StarredFile extends Preference {
  attachedTo: Ref<File>
}
