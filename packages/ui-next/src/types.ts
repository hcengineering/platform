//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { type Asset, type IntlString } from '@hcengineering/platform'
import { type ComponentType } from 'svelte'
import { type TextEditorHandler } from '@hcengineering/text-editor'
import { type BlobID } from '@hcengineering/communication-types'
import type { BlobMetadata, Markup, Ref, Timestamp } from '@hcengineering/core'
import type { Person } from '@hcengineering/contact'

export interface NavigationSection {
  id: string
  title: IntlString
  expanded: boolean
  total: number
  items: NavigationSectionItem[]
}

export interface NavigationSectionItem {
  id: string
  label: string
  icon: IconComponent
  notificationsCount?: number
}

export type IconSize = 'x-small' | 'small' | 'medium' | 'large'
export type IconComponent = Asset | ComponentType

export type TextInputActionFn = (element: HTMLElement, editor: TextEditorHandler, event?: MouseEvent) => void

export interface TextInputAction {
  label: IntlString
  icon: IconComponent
  action: TextInputActionFn
  order: number
  disabled?: boolean
}

export interface UploadedFile {
  blobId: BlobID
  type: string
  filename: string
  size: number
  metadata?: BlobMetadata
}

export interface Action {
  id: string
  label: IntlString
  icon: IconComponent
  action: (event: MouseEvent) => void
  order: number
  disabled?: boolean
}

export interface PresenceTyping {
  person: Ref<Person>
  lastTyping: Timestamp
}

export interface MessageDraft {
  content: Markup
  files: UploadedFile[]
}
