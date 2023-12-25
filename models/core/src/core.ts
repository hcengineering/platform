//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import {
  type Account,
  type AnyAttribute,
  type ArrOf,
  type AttachedDoc,
  type BlobData,
  type Class,
  type ClassifierKind,
  type Collection,
  type Configuration,
  type ConfigurationElement,
  type Doc,
  type DocIndexState,
  type Domain,
  DOMAIN_BLOB,
  DOMAIN_CONFIGURATION,
  DOMAIN_MIGRATION,
  DOMAIN_DOC_INDEX_STATE,
  DOMAIN_FULLTEXT_BLOB,
  DOMAIN_MODEL,
  type Enum,
  type EnumOf,
  type FieldIndex,
  type FullTextData,
  type FullTextSearchContext,
  type IndexingConfiguration,
  IndexKind,
  type IndexStageState,
  type Interface,
  type Mixin,
  type Obj,
  type PluginConfiguration,
  type Ref,
  type RefTo,
  type Space,
  type Timestamp,
  type Type,
  type Version,
  type MigrationState
} from '@hcengineering/core'
import {
  Hidden,
  Index,
  Mixin as MMixin,
  Model,
  Prop,
  ReadOnly,
  TypeBoolean,
  TypeIntlString,
  TypeRecord,
  TypeRef,
  TypeString,
  TypeTimestamp,
  UX
} from '@hcengineering/model'
import { getEmbeddedLabel, type IntlString, type Plugin } from '@hcengineering/platform'
import core from './component'

// C O R E
@Model(core.class.Obj, core.class.Obj)
export class TObj implements Obj {
  @Prop(TypeRef(core.class.Class), core.string.ClassLabel)
  @Index(IndexKind.Indexed)
  @Hidden()
    _class!: Ref<Class<this>>
}

@Model(core.class.Doc, core.class.Obj)
@UX(core.string.Object)
export class TDoc extends TObj implements Doc {
  @Prop(TypeRef(core.class.Doc), core.string.Id)
  @Hidden()
  // @Index(IndexKind.Indexed) // - automatically indexed by default.
    _id!: Ref<this>

  @Prop(TypeRef(core.class.Space), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
    space!: Ref<Space>

  @Prop(TypeTimestamp(), core.string.ModifiedDate)
  @Index(IndexKind.Indexed)
    modifiedOn!: Timestamp

  @Prop(TypeRef(core.class.Account), core.string.ModifiedBy)
  @Index(IndexKind.Indexed)
    modifiedBy!: Ref<Account>

  @Prop(TypeRef(core.class.Account), core.string.CreatedBy)
  @Index(IndexKind.Indexed)
    createdBy!: Ref<Account>

  @Prop(TypeTimestamp(), core.string.CreatedDate)
  @ReadOnly()
    createdOn!: Timestamp
}

@Model(core.class.AttachedDoc, core.class.Doc)
export class TAttachedDoc extends TDoc implements AttachedDoc {
  @Prop(TypeRef(core.class.Doc), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  @Hidden()
    attachedTo!: Ref<Doc>

  @Prop(TypeRef(core.class.Class), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  @Hidden()
    attachedToClass!: Ref<Class<Doc>>

  @Prop(TypeString(), core.string.Collection)
  @Hidden()
    collection!: string
}

@UX(core.string.ClassLabel)
@Model(core.class.Class, core.class.Doc, DOMAIN_MODEL)
export class TClass extends TDoc implements Class<Obj> {
  kind!: ClassifierKind

  @Prop(TypeIntlString(), core.string.ClassPropertyLabel)
    label!: IntlString

  extends!: Ref<Class<Obj>>
  domain!: Domain
}

@Model(core.class.Mixin, core.class.Class)
export class TMixin extends TClass implements Mixin<Doc> {}

@Model(core.class.Interface, core.class.Class)
export class TInterface extends TDoc implements Interface<Doc> {
  kind!: ClassifierKind
  label!: IntlString
  extends?: Ref<Interface<Doc>>[]
}

@UX(core.string.Enum)
@Model(core.class.Enum, core.class.Doc, DOMAIN_MODEL)
export class TEnum extends TDoc implements Enum {
  name!: string
  enumValues!: string[]
}

@Model(core.class.Attribute, core.class.Doc, DOMAIN_MODEL)
export class TAttribute extends TDoc implements AnyAttribute {
  attributeOf!: Ref<Class<Obj>>
  name!: string
  type!: Type<any>
  label!: IntlString
  isCustom?: boolean
  defaultValue?: any
}

@Model(core.class.Type, core.class.Obj, DOMAIN_MODEL)
export class TType extends TObj implements Type<any> {
  label!: IntlString
}

@UX(core.string.String)
@Model(core.class.TypeString, core.class.Type)
export class TTypeString extends TType {}

@UX(core.string.String)
@Model(core.class.TypeRecord, core.class.Type)
export class TTypeRecord extends TType {}

@UX(core.string.String)
@Model(core.class.TypeAttachment, core.class.Type)
export class TTypeAttachment extends TType {}

@UX(core.string.Hyperlink)
@Model(core.class.TypeHyperlink, core.class.Type)
export class TTypeHyperlink extends TType {}

@UX(core.string.IntlString)
@Model(core.class.TypeIntlString, core.class.Type)
export class TTypeIntlString extends TType {}

@UX(core.string.Number)
@Model(core.class.TypeNumber, core.class.Type)
export class TTypeNumber extends TType {}

@UX(core.string.Markup)
@Model(core.class.TypeMarkup, core.class.Type)
export class TTypeMarkup extends TType {}

@UX(core.string.Collaborative)
@Model(core.class.TypeCollaborativeMarkup, core.class.Type)
export class TTypeCollaborativeMarkup extends TType {}

@UX(core.string.Ref)
@Model(core.class.RefTo, core.class.Type)
export class TRefTo extends TType implements RefTo<Doc> {
  to!: Ref<Class<Doc>>
}

@UX(core.string.Collection)
@Model(core.class.Collection, core.class.Type)
export class TCollection extends TType implements Collection<AttachedDoc> {
  of!: Ref<Class<Doc>>
}

@UX(core.string.Array)
@Model(core.class.ArrOf, core.class.Type)
export class TArrOf extends TType implements ArrOf<Doc> {
  of!: Type<Doc>
}

@UX(core.string.Boolean)
@Model(core.class.TypeBoolean, core.class.Type)
export class TTypeBoolean extends TType {}

@UX(core.string.Timestamp)
@Model(core.class.TypeTimestamp, core.class.Type)
export class TTypeTimestamp extends TType {}

@UX(core.string.Ref)
@Model(core.class.TypeRelatedDocument, core.class.Type)
export class TTypeRelatedDocument extends TType {}

@UX(core.string.Date)
@Model(core.class.TypeDate, core.class.Type)
export class TTypeDate extends TType {}

@UX(core.string.Enum)
@Model(core.class.EnumOf, core.class.Type)
export class TEnumOf extends TType implements EnumOf {
  of!: Ref<Enum>
}

@Model(core.class.Version, core.class.Doc, DOMAIN_MODEL)
export class TVersion extends TDoc implements Version {
  major!: number
  minor!: number
  patch!: number
}

@Model(core.class.MigrationState, core.class.Doc, DOMAIN_MIGRATION)
export class TMigrationState extends TDoc implements MigrationState {
  plugin!: string
  state!: string
}

@Model(core.class.PluginConfiguration, core.class.Doc, DOMAIN_MODEL)
export class TPluginConfiguration extends TDoc implements PluginConfiguration {
  pluginId!: Plugin
  transactions!: Ref<Doc>[]

  label!: IntlString
  enabled!: boolean
  beta!: boolean
}

@Model(core.class.BlobData, core.class.Doc, DOMAIN_BLOB)
export class TBlobData extends TDoc implements BlobData {
  name!: string
  file!: string
  size!: number
  type!: string
  base64Data!: string
}

@Model(core.class.FulltextData, core.class.Doc, DOMAIN_FULLTEXT_BLOB)
export class TFulltextData extends TDoc implements FullTextData {
  data!: any
}

@Model(core.class.DocIndexState, core.class.Doc, DOMAIN_DOC_INDEX_STATE)
export class TDocIndexState extends TDoc implements DocIndexState {
  @Prop(TypeRef(core.class.Class), core.string.Class)
  @Index(IndexKind.Indexed)
  @Hidden()
    objectClass!: Ref<Class<Doc>>

  @Prop(TypeRef(core.class.Doc), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  @Hidden()
    attachedTo?: Ref<Doc>

  @Prop(TypeRef(core.class.Class), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  @Hidden()
    attachedToClass?: Ref<Class<Doc>>

  // Indexable attributes of document.
  attributes!: Record<string, any>

  @Prop(TypeBoolean(), getEmbeddedLabel('Removed'))
  @Index(IndexKind.Indexed)
  @Hidden()
    removed!: boolean

  // States for different stages
  @Prop(TypeRecord(), getEmbeddedLabel('Stages'))
  @Index(IndexKind.Indexed)
  @Hidden()
    stages!: Record<string, boolean | string>
}

@Model(core.class.IndexStageState, core.class.Doc, DOMAIN_DOC_INDEX_STATE)
export class TIndexStageState extends TDoc implements IndexStageState {
  stageId!: string
  attributes!: Record<string, any>
}

@MMixin(core.mixin.FullTextSearchContext, core.class.Class)
export class TFullTextSearchContext extends TClass implements FullTextSearchContext {}

@MMixin(core.mixin.ConfigurationElement, core.class.Class)
export class TConfigurationElement extends TClass implements ConfigurationElement {
  @Prop(TypeIntlString(), core.string.Private)
    title!: IntlString

  @Prop(TypeIntlString(), core.string.Private)
    group!: IntlString
}

@Model(core.class.Configuration, core.class.Doc, DOMAIN_CONFIGURATION)
export class TConfiguration extends TDoc implements Configuration {
  @Prop(TypeBoolean(), core.string.Private)
    enabled!: boolean
}

@MMixin(core.mixin.IndexConfiguration, core.class.Class)
export class TIndexConfiguration<T extends Doc = Doc> extends TClass implements IndexingConfiguration<T> {
  indexes!: FieldIndex<T>[]
  searchDisabled!: boolean
}
