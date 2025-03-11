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

import { type Data, type Markup, type Ref } from '@hcengineering/core'
import { type Asset, type IntlString } from '@hcengineering/platform'
import { type ComponentType } from 'svelte'
import { type Person, type AvatarInfo } from '@hcengineering/contact'
import { type TextEditorHandler } from '@hcengineering/text-editor'

export interface NavigationSection {
  id: string
  title: IntlString
  expanded: boolean
  items: NavigationSectionItem[]
}

export interface NavigationSectionItem {
  id: string
  label: string
  icon: IconComponent
}

export interface MessageType {
  id: string | number
  text: Markup
  authorName: string
  author?: Ref<Person>
  avatar: Data<AvatarInfo> | undefined
  date: Date
  edited?: Date
  reactions: ReactionType[]
  repliesCount?: number
  lastReplyDate?: Date
}

export interface ReactionType {
  id: string
  emoji: string
  count: number
  selected?: boolean
  persons: Array<Ref<Person>>
}

export type IconSize = 'x-small' | 'small' | 'medium' | 'large'
export type IconComponent = Asset | ComponentType

export enum AvatarSize {
  XSmall = 'x-small',
  Small = 'small',
  Regular = 'regular',
  Medium = 'medium',
  Large = 'large',
  XLarge = 'x-large',
  XXLarge = 'xx-large',
  XXXLarge = 'xxx-large'
}

export enum AvatarShape {
  Circle = 'circle'
}

export enum ButtonVariant {
  Default = 'default',
  Ghost = 'ghost'
}

export enum ButtonType {
  Submit = 'submit',
  Reset = 'reset',
  Button = 'button'
}

export enum ButtonSize {
  Auto = 'auto',
  Small = 'small',
  Medium = 'medium',
  Large = 'large'
}

export type TextInputActionFn = (element: HTMLElement, editor: TextEditorHandler, event?: MouseEvent) => void

export interface TextInputAction {
  label: IntlString
  icon: IconComponent
  action: TextInputActionFn
  order: number
  disabled?: boolean
}
