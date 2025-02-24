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

import { DOMAIN_MODEL, type Tx, type Blob, type Class, type Doc, type Ref } from '@hcengineering/core'
import { Mixin, Model, Prop, TypeRef, TypeString, type Builder } from '@hcengineering/model'
import core, { TClass, TDoc } from '@hcengineering/model-core'
import { type Asset, type IntlString, type Resource } from '@hcengineering/platform'
// Import types to prevent .svelte components to being exposed to type typescript.
import {
  type PresentationMiddlewareCreator,
  type PresentationMiddlewareFactory
} from '@hcengineering/presentation/src/pipeline'
import {
  type BlobMetadata,
  type ComponentPointExtension,
  type CreateExtensionKind,
  type DocAttributeRule,
  type DocCreateExtension,
  type DocCreateFunction,
  type DocCreateAnalyticsPropsFunction,
  type DocRules,
  type FileOrBlob,
  type FilePreviewExtension,
  type ObjectSearchCategory,
  type ObjectSearchContext,
  type ObjectSearchFactory,
  type InstantTransactions
} from '@hcengineering/presentation/src/types'
import { type AnyComponent, type ComponentExtensionId } from '@hcengineering/ui/src/types'
import presentation from './plugin'

export { presentationId } from '@hcengineering/presentation/src/plugin'
export { default } from './plugin'
export type {
  CreateExtensionKind,
  DocCreateExtension,
  DocCreateFunction,
  ObjectSearchCategory,
  ObjectSearchFactory,
  DocCreateAnalyticsPropsFunction
}

@Model(presentation.class.ObjectSearchCategory, core.class.Doc, DOMAIN_MODEL)
export class TObjectSearchCategory extends TDoc implements ObjectSearchCategory {
  label!: IntlString
  icon!: Asset
  title!: IntlString
  context!: ObjectSearchContext[]

  // Query for documents with pattern
  query!: Resource<ObjectSearchFactory>
  classToSearch!: Ref<Class<Doc>>
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

@Model(presentation.class.DocCreateExtension, core.class.Doc, DOMAIN_MODEL)
export class TDocCreateExtension extends TDoc implements DocCreateExtension {
  @Prop(TypeRef(core.class.Class), core.string.Class)
    ofClass!: Ref<Class<Doc>>

  components!: Record<CreateExtensionKind, AnyComponent>
  apply!: Resource<DocCreateFunction>
  getAnalyticsProps?: Resource<(doc: Doc) => Record<string, string>>
}

@Model(presentation.class.DocRules, core.class.Doc, DOMAIN_MODEL)
export class TDocRules extends TDoc implements DocRules {
  @Prop(TypeRef(core.class.Class), core.string.Class)
    ofClass!: Ref<Class<Doc>>

  fieldRules!: DocAttributeRule[]
}

@Model(presentation.class.FilePreviewExtension, presentation.class.ComponentPointExtension)
export class TFilePreviewExtension extends TComponentPointExtension implements FilePreviewExtension {
  @Prop(TypeString(), presentation.string.ContentType)
    contentType!: string | string[]

  alignment?: string
  metadataProvider?: Resource<(file: FileOrBlob, blob: Ref<Blob>) => Promise<BlobMetadata | undefined>>
  availabilityChecker?: Resource<() => Promise<boolean>>
}

@Mixin(presentation.mixin.InstantTransactions, core.class.Class)
export class TInstantTransactions extends TClass implements InstantTransactions {
  txClasses!: Array<Ref<Class<Tx>>>
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TObjectSearchCategory,
    TPresentationMiddlewareFactory,
    TComponentPointExtension,
    TDocCreateExtension,
    TDocRules,
    TFilePreviewExtension,
    TInstantTransactions
  )
}
