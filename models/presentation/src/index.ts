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
import { Builder, Model } from '@hcengineering/model'
import core, { TDoc } from '@hcengineering/model-core'
import { Asset, IntlString, Resource } from '@hcengineering/platform'
// Import types to prevent .svelte components to being exposed to type typescript.
import {
  ComponentPointExtension,
  ObjectSearchCategory,
  ObjectSearchFactory
} from '@hcengineering/presentation/src/types'
import presentation from './plugin'
import { PresentationMiddlewareCreator, PresentationMiddlewareFactory } from '@hcengineering/presentation'
import { AnyComponent, ComponentExtensionId } from '@hcengineering/ui'

export { presentationId } from '@hcengineering/presentation/src/plugin'
export { default } from './plugin'
export { ObjectSearchCategory, ObjectSearchFactory }

@Model(presentation.class.ObjectSearchCategory, core.class.Doc, DOMAIN_MODEL)
export class TObjectSearchCategory extends TDoc implements ObjectSearchCategory {
  label!: IntlString
  icon!: Asset

  // Query for documents with pattern
  query!: Resource<ObjectSearchFactory>
}

@Model(presentation.class.PresentationMiddlewareFactory, core.class.Doc, DOMAIN_MODEL)
export class TPresentationMiddlewareFactory extends TDoc implements PresentationMiddlewareFactory {
  createPresentationMiddleware!: Resource<PresentationMiddlewareCreator>
}

@Model(presentation.class.ComponentPointExtension, core.class.Doc, DOMAIN_MODEL)
export class TComponentPointExtension extends TDoc implements ComponentPointExtension {
  extension!: ComponentExtensionId
  component!: AnyComponent
  props!: Record<string, any>
  order!: number
}

export function createModel (builder: Builder): void {
  builder.createModel(TObjectSearchCategory, TPresentationMiddlewareFactory, TComponentPointExtension)
}
