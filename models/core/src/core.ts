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
  type PersonId,
  type AnyAttribute,
  type ArrOf,
  type Association,
  type AttachedDoc,
  type Blob,
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
  DOMAIN_DOC_INDEX_STATE,
  DOMAIN_MIGRATION,
  DOMAIN_MODEL,
  DOMAIN_RELATION,
  type DomainIndexConfiguration,
  type Enum,
  type EnumOf,
  type FieldIndexConfig,
  type FullTextSearchContext,
  type IndexingConfiguration,
  IndexKind,
  type Interface,
  type MigrationState,
  type Mixin,
  type Obj,
  type PluginConfiguration,
  type Ref,
  type RefTo,
  type Relation,
  type Space,
  type Sequence,
  type Timestamp,
  type TransientConfiguration,
  type Type,
  type TypeAny,
  type Version,
  DOMAIN_SEQUENCE
} from '@hcengineering/core'
import {
  Hidden,
  Index,
  Mixin as MMixin,
  Model,
  Prop,
  ReadOnly,
  TypeBoolean,
  TypeFileSize,
  TypeIntlString,
  TypeRef,
  TypeString,
  TypeTimestamp,
  TypePersonId,
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

  @Prop(TypePersonId(), core.string.ModifiedBy)
  @Index(IndexKind.Indexed)
    modifiedBy!: PersonId

  @Prop(TypePersonId(), core.string.CreatedBy)
  @Index(IndexKind.Indexed)
    createdBy!: PersonId

  @Prop(TypeTimestamp(), core.string.CreatedDate)
  @ReadOnly()
  @Index(IndexKind.IndexedDsc)
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

@Model(core.class.Association, core.class.Doc, DOMAIN_MODEL)
export class TAssociation extends TDoc implements Association {
  classA!: Ref<Class<Doc>>

  classB!: Ref<Class<Doc>>

  nameA!: string

  nameB!: string

  type!: '1:1' | '1:N' | 'N:N'
}

@Model(core.class.Relation, core.class.Doc, DOMAIN_RELATION)
export class TRelation extends TDoc implements Relation {
  docA!: Ref<Doc<Space>>

  docB!: Ref<Doc<Space>>

  association!: Ref<Association>
}

@Model(core.class.Blob, core.class.Doc, DOMAIN_BLOB)
@UX(core.string.Object)
export class TBlob extends TDoc implements Blob {
  @Prop(TypeString(), core.string.Blob)
  @ReadOnly()
  // @Index(IndexKind.Indexed)
    provider!: string

  @Prop(TypeString(), core.string.BlobContentType)
  @ReadOnly()
    contentType!: string

  @Prop(TypeString(), core.string.BlobStorageId)
  @ReadOnly()
    storageId!: string

  @Prop(TypeString(), core.string.BlobEtag)
  @ReadOnly()
    etag!: string

  @Prop(TypeString(), core.string.BlobVersion)
  @ReadOnly()
    version!: string

  @Prop(TypeFileSize(), core.string.BlobSize)
  @ReadOnly()
    size!: number
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
@Model(core.class.TypeBlob, core.class.Type)
export class TTypeBlob extends TType {}

@UX(core.string.Hyperlink)
@Model(core.class.TypeHyperlink, core.class.Type)
export class TTypeHyperlink extends TType {}

@UX(core.string.IntlString)
@Model(core.class.TypeIntlString, core.class.Type)
export class TTypeIntlString extends TType {}

@UX(core.string.Number)
@Model(core.class.TypeNumber, core.class.Type)
export class TTypeNumber extends TType {}

@UX(core.string.BlobSize)
@Model(core.class.TypeFileSize, core.class.Type)
export class TTypeFileSize extends TType {}

@UX(core.string.Markup)
@Model(core.class.TypeMarkup, core.class.Type)
export class TTypeMarkup extends TType {}

@UX(core.string.PersonId)
@Model(core.class.TypePersonId, core.class.Type)
export class TTypePersonId extends TType {}

@UX(core.string.AccountId)
@Model(core.class.TypeAccountUuid, core.class.Type)
export class TTypeAccountUuid extends TType {}

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

@UX(getEmbeddedLabel('Any'))
@Model(core.class.TypeAny, core.class.Type)
export class TTypeAny extends TType implements TypeAny {
  presenter!: any
  editor!: any
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

@Model(core.class.DocIndexState, core.class.Doc, DOMAIN_DOC_INDEX_STATE)
export class TDocIndexState extends TDoc implements DocIndexState {
  @Prop(TypeRef(core.class.Class), core.string.Class)
  @Index(IndexKind.Indexed)
  @Hidden()
    objectClass!: Ref<Class<Doc>>

  @Prop(TypeBoolean(), getEmbeddedLabel('Removed'))
  @Hidden()
    removed!: boolean

  @Prop(TypeBoolean(), getEmbeddedLabel('NeedIndexing'))
  @Hidden()
    needIndex!: boolean
}

@Model(core.class.FullTextSearchContext, core.class.Doc, DOMAIN_MODEL)
export class TFullTextSearchContext extends TDoc implements FullTextSearchContext {
  toClass!: Ref<Class<Doc<Space>>>
}

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
  indexes!: (string | FieldIndexConfig<T>)[]
  searchDisabled!: boolean
}

@Model(core.class.DomainIndexConfiguration, core.class.Doc, DOMAIN_MODEL)
export class TDomainIndexConfiguration extends TDoc implements DomainIndexConfiguration {
  domain!: Domain
}

@UX(core.string.CollaborativeDoc)
@Model(core.class.TypeCollaborativeDoc, core.class.Type)
export class TTypeCollaborativeDoc extends TType {}

@UX(core.string.Rank)
@Model(core.class.TypeRank, core.class.Type)
export class TTypeRank extends TType {}

@MMixin(core.mixin.TransientConfiguration, core.class.Class)
export class TTransientConfiguration extends TClass implements TransientConfiguration {
  @Prop(TypeBoolean(), core.string.Private)
    broadcastOnly!: boolean
}

@Model(core.class.Sequence, core.class.Doc, DOMAIN_SEQUENCE)
export class TSequence extends TDoc implements Sequence {
  @Prop(TypeRef(core.class.Class), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
    attachedTo!: Ref<Class<Doc>>

  sequence!: number
}
