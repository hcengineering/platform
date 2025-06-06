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

import { type IntlString } from '@hcengineering/platform'
import { type TextEditorHandler } from '@hcengineering/text-editor'
import { type LinkPreviewData, type FileData } from '@hcengineering/communication-types'
import type { Markup, Ref, Timestamp } from '@hcengineering/core'
import type { Person } from '@hcengineering/contact'
import type { IconComponent } from '@hcengineering/ui'

export type TextInputActionFn = (element: HTMLElement, editor: TextEditorHandler, event?: MouseEvent) => void

export interface TextInputAction {
  label: IntlString
  icon: IconComponent
  action: TextInputActionFn
  order: number
  disabled?: boolean
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
  _id: string
  content: Markup
  files: FileData[]
  links: LinkPreviewData[]
}
