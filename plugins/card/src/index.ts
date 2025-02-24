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

import { Class, Mixin, Doc, Ref, MarkupBlobRef, Rank } from '@hcengineering/core'
import { Asset, IntlString, plugin, Plugin } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui'

export * from './analytics'

export interface MasterTag extends Class<Card> {}

export interface Tag extends MasterTag, Mixin<Card> {}

export interface Card extends Doc {
  attachments?: number
  _class: Ref<MasterTag>
  title: string
  content: MarkupBlobRef
  parent?: Ref<Card> | null
  rank: Rank
}

export interface MasterTagEditorSection extends Doc {
  id: string
  label: IntlString
  component: AnyComponent
  masterOnly?: boolean
}

/**
 * @public
 */
export const cardId = 'card' as Plugin

/**
 * @public
 */
const cardPlugin = plugin(cardId, {
  class: {
    Card: '' as Ref<Class<Card>>,
    MasterTag: '' as Ref<Class<MasterTag>>,
    Tag: '' as Ref<Class<Tag>>,
    MasterTagEditorSection: '' as Ref<Class<MasterTagEditorSection>>
  },
  icon: {
    MasterTags: '' as Asset,
    MasterTag: '' as Asset,
    Tag: '' as Asset,
    Tags: '' as Asset,
    Card: '' as Asset
  },
  string: {
    MasterTag: '' as IntlString,
    MasterTags: '' as IntlString,
    Tags: '' as IntlString,
    Tag: '' as IntlString,
    Card: '' as IntlString,
    Cards: '' as IntlString,
    CardApplication: '' as IntlString
  }
})

export default cardPlugin
