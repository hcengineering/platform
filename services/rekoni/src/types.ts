//
// Copyright © 2022 Hardcore Engineering Inc.
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

/**
 * @public
 */
export interface ReconiDocument {
  format: string
  firstName: string
  lastName: string
  title?: string
  avatar?: string
  avatarName?: string
  avatarFormat?: string
  email?: string
  phone?: string
  city?: string
  skype?: string
  linkedin?: string
  gmail?: string
  github?: string
  facebook?: string
  telegram?: string
  twitter?: string
  skills: string[]
}

/**
 * One item per line
 */
export interface RekoniItem {
  // Text representation
  items: string[]

  // Individual widths
  widths: number[]

  // Max height
  height: number
}
export interface RekoniAnnotation {
  type: string
  value: string
}
export interface RekoniModelImage {
  name: string
  width: number
  height: number
  buffer: Buffer
  pngBuffer: Buffer
  format: string
  potentialAvatar: boolean
}
export interface RekoniModel {
  // Lines in document.
  lines: RekoniItem[]
  annotations: RekoniAnnotation[]
  images: RekoniModelImage[]
  author: string | undefined
}
