//
// Copyright © 2023 Hardcore Engineering Inc.
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
import { type Class, type Doc, type Ref, type UserStatus, type AccountUuid } from '@hcengineering/core'
import { type DocNotifyContext } from '@hcengineering/notification'
import { type AnySvelteComponent, type IconSize, type Action } from '@hcengineering/ui'

export type ChatGroup = 'activity' | 'direct' | 'channels' | 'starred'

export interface SortFnOptions {
  contexts: DocNotifyContext[]
  userStatusByAccount: Map<AccountUuid, UserStatus>
}

export interface ChatNavGroupModel {
  id: ChatGroup
  label?: IntlString
  sortFn: (items: ChatNavItemModel[], options: SortFnOptions) => ChatNavItemModel[]
  wrap: boolean
  getActionsFn?: (contexts: DocNotifyContext[]) => Action[]
  maxSectionItems?: number
  isPinned: boolean
  _class?: Ref<Class<Doc>>
  skipClasses?: Array<Ref<Class<Doc>>>
}

export interface ChatNavItemModel {
  id: Ref<Doc>
  object: Doc
  title: string
  description?: string
  icon: Asset | AnySvelteComponent | undefined
  iconSize?: IconSize
  iconProps: Record<string, any>
  withIconBackground: boolean
}

export interface SelectChannelEvent {
  object: Doc
}
