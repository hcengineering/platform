//
// Copyright © 2020 Anticrm Platform Contributors.
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

import { DOMAIN_MODEL } from '@hcengineering/core'
import { type Builder, Model } from '@hcengineering/model'
import core, { TDoc } from '@hcengineering/model-core'
import type { Asset, IntlString, Resource } from '@hcengineering/platform'
import { type ExtensionCreator, type TextEditorExtensionFactory, type RefInputAction, type RefInputActionItem } from '@hcengineering/text-editor'
import textEditor from './plugin'

export { textEditorOperation } from './migration'
export { default } from './plugin'
export { textEditorId } from '@hcengineering/text-editor'
export type { RefInputAction, RefInputActionItem }

@Model(textEditor.class.RefInputActionItem, core.class.Doc, DOMAIN_MODEL)
export class TRefInputActionItem extends TDoc implements RefInputActionItem {
  label!: IntlString
  icon!: Asset

  // Query for documents with pattern
  action!: Resource<RefInputAction>
}

@Model(textEditor.class.TextEditorExtensionFactory, core.class.Doc, DOMAIN_MODEL)
export class TTextEditorExtensionFactory extends TDoc implements TextEditorExtensionFactory {
  index!: number
  create!: Resource<ExtensionCreator>
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TRefInputActionItem,
    TTextEditorExtensionFactory
  )
}
