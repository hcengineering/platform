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

import { Class, Doc, Domain, IndexKind, Ref } from '@hcengineering/core'
import { ArrOf, Builder, Index, Model, Prop, TypeNumber, TypeRef, TypeString, UX } from '@hcengineering/model'
import core, { TAttachedDoc, TDoc } from '@hcengineering/model-core'
import view from '@hcengineering/model-view'
import { Asset, IntlString } from '@hcengineering/platform'
import type {
  ExpertKnowledge,
  InitialKnowledge,
  MeaningfullKnowledge,
  TagCategory,
  TagElement,
  TagReference
} from '@hcengineering/tags'
import tags from './plugin'

export { TagCategory, TagElement, TagReference, tagsId } from '@hcengineering/tags'
export { tagsOperation } from './migration'
export { tags as default }

export const DOMAIN_TAGS = 'tags' as Domain

@Model(tags.class.TagElement, core.class.Doc, DOMAIN_TAGS)
@UX(tags.string.TagElementLabel)
export class TTagElement extends TDoc implements TagElement {
  @Prop(TypeString(), tags.string.TitleLabel)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeRef(core.class.Class), tags.string.TargetClassLabel)
    targetClass!: Ref<Class<Doc>>

  @Prop(TypeString(), tags.string.DescriptionLabel)
  @Index(IndexKind.FullText)
    description!: string

  @Prop(TypeString(), tags.string.ColorLabel)
    color!: number

  @Prop(TypeRef(tags.class.TagCategory), tags.string.CategoryLabel)
    category!: Ref<TagCategory>

  @Prop(TypeNumber(), tags.string.TagReference)
    refCount?: number
}

@Model(tags.class.TagReference, core.class.AttachedDoc, DOMAIN_TAGS)
@UX(tags.string.TagReferenceLabel)
export class TTagReference extends TAttachedDoc implements TagReference {
  @Prop(TypeString(), tags.string.TitleLabel)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeRef(tags.class.TagElement), tags.string.TagLabel)
  @Index(IndexKind.Indexed)
    tag!: Ref<TagElement>

  @Prop(TypeString(), tags.string.ColorLabel)
    color!: number

  @Prop(TypeNumber(), tags.string.Weight)
    weight!: InitialKnowledge | MeaningfullKnowledge | ExpertKnowledge
}

@Model(tags.class.TagCategory, core.class.Doc, DOMAIN_TAGS)
@UX(tags.string.TargetCategoryLabel)
export class TTagCategory extends TDoc implements TagCategory {
  @Prop(TypeString(), tags.string.AssetLabel)
    icon!: Asset

  @Prop(TypeString(), tags.string.CategoryLabel)
    label!: IntlString

  @Prop(TypeString(), tags.string.CategoryTargetClass)
    targetClass!: Ref<Class<Doc>>

  @Prop(ArrOf(TypeRef(core.class.TypeString)), tags.string.CategoryTagsLabel)
    tags!: string[]

  @Prop(TypeString(), tags.string.DefaultLabel)
    default!: boolean
}

export function createModel (builder: Builder): void {
  builder.createModel(TTagElement, TTagReference, TTagCategory)

  builder.mixin(tags.class.TagElement, core.class.Class, view.mixin.ObjectFactory, {
    create: tags.function.CreateTagElement
  })

  builder.mixin(tags.class.TagReference, core.class.Class, view.mixin.CollectionEditor, {
    editor: tags.component.Tags,
    inlineEditor: tags.component.TagsAttributeEditor
  })

  builder.mixin(tags.class.TagReference, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tags.component.TagReferencePresenter
  })
  builder.mixin(tags.class.TagElement, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tags.component.TagElementPresenter
  })

  builder.mixin(tags.class.TagReference, core.class.Class, view.mixin.AttributeFilter, {
    component: tags.component.TagsFilter
  })

  builder.mixin(tags.class.TagElement, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Open]
  })

  builder.mixin(tags.class.TagReference, core.class.Class, view.mixin.AttributeFilterPresenter, {
    presenter: tags.component.TagsFilterPresenter
  })

  builder.createDoc(
    view.class.FilterMode,
    core.space.Model,
    {
      label: view.string.FilterIsEither,
      selectedLabel: view.string.FilterIsEitherPlural,
      result: tags.function.FilterTagsInResult
    },
    tags.filter.FilterTagsIn
  )

  builder.createDoc(
    view.class.FilterMode,
    core.space.Model,
    {
      label: view.string.FilterIsNot,
      result: tags.function.FilterTagsNinResult
    },
    tags.filter.FilterTagsNin
  )
}
