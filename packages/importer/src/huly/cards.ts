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

import { Attachment } from '@hcengineering/attachment'
import card, { Card, CardSpace, MasterTag, Tag } from '@hcengineering/card'
import core, {
  Association,
  Attribute,
  BlobType,
  Class,
  Doc,
  Enum,
  generateId,
  Ref,
  Relation,
  Space
} from '@hcengineering/core'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { contentType } from 'mime-types'
import * as path from 'path'
import { IntlString } from '../../../platform/types'
import { Logger } from '../importer/logger'
import { Props, UnifiedDoc, UnifiedFile, UnifiedMixin, UnifiedUpdate } from '../types'
import { UnifiedFormatParser } from './parser'
import { AssociationMetadata, MetadataRegistry } from './registry'
import {
  AssociationSchema,
  BaseFieldType,
  BooleanFieldType,
  EnumSchema,
  FieldType,
  FormatSchema,
  MasterTagSchema,
  NumberFieldType,
  OneOfFieldType,
  PathFieldType,
  StringFieldType,
  TagSchema
} from './schema'
import { validateSchema } from './validation'

export interface UnifiedDocProcessResult {
  docs: Map<string, Array<UnifiedDoc<Doc>>>
  mixins: Map<string, Array<UnifiedMixin<Doc, Doc>>>
  updates: Map<string, Array<UnifiedUpdate<Doc>>>
  files: Map<string, UnifiedFile>
}

export class CardsProcessor {
  constructor (
    private readonly metadataRegistry: MetadataRegistry,
    private readonly parser: UnifiedFormatParser,
    private readonly logger: Logger
  ) {}

  async processDirectory (directoryPath: string): Promise<UnifiedDocProcessResult> {
    this.logger.log('Start looking for cards stuff in:' + directoryPath)

    const result: UnifiedDocProcessResult = {
      docs: new Map(),
      mixins: new Map(),
      updates: new Map(),
      files: new Map()
    }

    await this.processSystemTypes(directoryPath, result)

    const topLevelTypes = new Array<UnifiedDoc<MasterTag>>()
    await this.processMetadata(directoryPath, result, topLevelTypes)

    const typesRefs = topLevelTypes.map((type) => type.props._id) as Ref<MasterTag>[]
    if (typesRefs.length > 0) {
      const updateDefaultSpace: UnifiedUpdate<CardSpace> = {
        _class: card.class.CardSpace,
        _id: 'card:space:Default' as Ref<CardSpace>,
        space: core.space.Model,
        props: {
          $push: {
            types: {
              $each: [...new Set(typesRefs)],
              $position: 0
            }
          }
        }
      }
      result.updates.set('card:space:Default', [updateDefaultSpace])
    }

    await this.processSystemTypeCards(directoryPath, result, new Map(), new Map())
    await this.processCards(directoryPath, result, new Map(), new Map())

    return result
  }

  private async processSystemTypes (currentPath: string, result: UnifiedDocProcessResult): Promise<void> {
    const folders = fs
      .readdirSync(currentPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((folder) => folder.name === card.types.File || folder.name === card.types.Document)

    for (const folder of folders) {
      const folderPath = path.join(currentPath, folder.name)
      await this.processMetadata(folderPath, result, [], folder.name as Ref<MasterTag>)
    }
  }

  private async processMetadata (
    currentPath: string,
    result: UnifiedDocProcessResult,
    types: Array<UnifiedDoc<MasterTag>>,
    parentMasterTagId?: Ref<MasterTag>
  ): Promise<void> {
    const yamlFiles = fs
      .readdirSync(currentPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))

    for (const entry of yamlFiles) {
      const yamlPath = path.resolve(currentPath, entry.name)
      this.logger.log('Reading yaml file: ' + yamlPath)
      const yamlConfig = yaml.load(fs.readFileSync(yamlPath, 'utf8')) as Record<string, any>

      switch (yamlConfig?.class) {
        case card.class.MasterTag: {
          const masterTagId = this.metadataRegistry.getRef(yamlPath) as Ref<MasterTag>
          const masterTag = await this.createMasterTag(yamlConfig, yamlPath, parentMasterTagId)
          const masterTagAttributes = await this.createAttributes(yamlPath, yamlConfig, masterTagId)

          this.metadataRegistry.setAttributes(yamlPath, masterTagAttributes)
          result.docs.set(yamlPath, [masterTag, ...Array.from(masterTagAttributes.values())])
          types.push(masterTag)

          const masterTagDir = path.join(currentPath, path.basename(yamlPath, '.yaml'))
          if (fs.existsSync(masterTagDir) && fs.statSync(masterTagDir).isDirectory()) {
            await this.processMetadata(masterTagDir, result, [], masterTagId)
          }
          break
        }
        case card.class.Tag: {
          if (parentMasterTagId === undefined) {
            throw new Error('Tag should be inside master tag folder: ' + currentPath)
          }
          await this.processTag(yamlPath, yamlConfig, result, parentMasterTagId)
          break
        }
        case core.class.Association: {
          const association = await this.createAssociation(yamlPath, yamlConfig)
          result.docs.set(yamlPath, [association])
          break
        }
        case core.class.Enum: {
          const enumDoc = await this.createEnum(yamlPath, yamlConfig)
          this.metadataRegistry.setEnumValues(yamlPath, yamlConfig.values)
          result.docs.set(yamlPath, [enumDoc])
          break
        }
        default:
          this.logger.log('Skipping class: ' + yamlConfig?.class)
      }
    }
  }

  private async processCards (
    currentPath: string,
    result: UnifiedDocProcessResult,
    masterTagAssociaions: Map<string, AssociationMetadata>,
    masterTagAttributes: Map<string, UnifiedDoc<Attribute<MasterTag>>>,
    masterTagId?: Ref<MasterTag>
  ): Promise<void> {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })

    // Check if there is a YAML file for the current directory
    const yamlPath = currentPath + '.yaml'
    if (fs.existsSync(yamlPath)) {
      const yamlConfig = yaml.load(fs.readFileSync(yamlPath, 'utf8')) as Record<string, any>
      if (yamlConfig?.class === card.class.MasterTag) {
        masterTagId = this.metadataRegistry.getRef(yamlPath) as Ref<MasterTag>
        this.metadataRegistry.getAssociations(yamlPath).forEach((AssociationMetadata, propName) => {
          masterTagAssociaions.set(propName, AssociationMetadata)
        })
        this.metadataRegistry.getAttributes(yamlPath).forEach((attr, propName) => {
          masterTagAttributes.set(propName, attr)
        })
      }
    }

    // Process MD files with the current MasterTag
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const cardPath = path.join(currentPath, entry.name)
        const { class: cardType, ...cardProps } = this.parser.readYamlHeader(cardPath)

        if (masterTagId !== undefined) {
          await this.processCard(result, cardPath, cardProps, masterTagId, masterTagAssociaions, masterTagAttributes)
        }
      }
    }

    // Process subdirectories that have corresponding YAML files
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const dirPath = path.join(currentPath, entry.name)
      const dirYamlPath = dirPath + '.yaml'

      // Only process directories that have a corresponding YAML file
      if (fs.existsSync(dirYamlPath)) {
        await this.processCards(dirPath, result, masterTagAssociaions, masterTagAttributes, masterTagId)
      }
    }
  }

  private async processSystemTypeCards (
    currentDir: string,
    result: UnifiedDocProcessResult,
    masterTagAssociaions: Map<string, AssociationMetadata>,
    masterTagAttributes: Map<string, UnifiedDoc<Attribute<MasterTag>>>
  ): Promise<void> {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const cardPath = path.join(currentDir, entry.name)
        const { class: cardType, ...cardProps } = this.parser.readYamlHeader(cardPath)

        if (cardType !== undefined && cardType.startsWith('card:types:') === false) {
          throw new Error('Unsupported card type: ' + cardType + ' in ' + cardPath)
        }

        await this.processCard(result, cardPath, cardProps, cardType, masterTagAssociaions, masterTagAttributes)
      } else if (entry.isDirectory() && (entry.name === card.types.File || entry.name === card.types.Document)) {
        await this.processCards(path.join(currentDir, entry.name), result, masterTagAssociaions, masterTagAttributes)
      }
    }
  }

  private async processCard (
    result: UnifiedDocProcessResult,
    cardPath: string,
    cardProps: Record<string, any>,
    masterTagId: Ref<MasterTag>,
    masterTagAssociaions: Map<string, AssociationMetadata>,
    masterTagAttributes: Map<string, UnifiedDoc<Attribute<MasterTag>>>,
    parentCardId?: Ref<Card>
  ): Promise<void> {
    this.logger.log('Processing card: ' + cardPath)

    if (cardProps.blobs !== undefined) {
      await this.createBlobs(cardProps.blobs, cardPath, result)
    }

    const cardWithRelations = await this.createCardWithRelations(
      cardProps,
      cardPath,
      masterTagId,
      masterTagAssociaions,
      masterTagAttributes,
      result.files,
      parentCardId
    )

    if (cardWithRelations.length > 0) {
      const docs = result.docs.get(cardPath) ?? []
      docs.push(...cardWithRelations)
      result.docs.set(cardPath, docs)

      const card = cardWithRelations[0] as UnifiedDoc<Card>
      this.metadataRegistry.setRefMetadata(cardPath, card._class, card.props.title)
      await this.applyTags(card, cardProps, cardPath, result)

      if (cardProps.attachments !== undefined) {
        await this.createAttachments(cardProps.attachments, cardPath, card, result)
      }

      const cardDir = path.join(path.dirname(cardPath), path.basename(cardPath, '.md'))
      if (fs.existsSync(cardDir) && fs.statSync(cardDir).isDirectory()) {
        await this.processCardDirectory(
          result,
          cardDir,
          masterTagId,
          masterTagAssociaions,
          masterTagAttributes,
          card.props._id as Ref<Card>
        )
      }
    }
  }

  private async processCardDirectory (
    result: UnifiedDocProcessResult,
    cardDir: string,
    masterTagId: Ref<MasterTag>,
    masterTagAssociaions: Map<string, AssociationMetadata>,
    masterTagAttributes: Map<string, UnifiedDoc<Attribute<MasterTag>>>,
    parentCardId?: Ref<Card>
  ): Promise<void> {
    const entries = fs
      .readdirSync(cardDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))

    for (const entry of entries) {
      const childCardPath = path.join(cardDir, entry.name)
      const { class: cardClass, ...cardProps } = this.parser.readYamlHeader(childCardPath)
      await this.processCard(
        result,
        childCardPath,
        cardProps,
        masterTagId,
        masterTagAssociaions,
        masterTagAttributes,
        parentCardId
      )
    }
  }

  private async createMasterTag (
    data: Record<string, any>,
    filePath: string,
    parentMasterTagId?: Ref<MasterTag>
  ): Promise<UnifiedDoc<MasterTag>> {
    this.validateFormat(data, MasterTagSchema, filePath)
    const { class: _class, title } = data
    if (_class !== card.class.MasterTag) {
      throw new Error('Invalid master tag data')
    }

    return {
      _class: card.class.MasterTag,
      props: {
        _id: this.metadataRegistry.getRef(filePath) as Ref<MasterTag>,
        space: core.space.Model,
        extends: parentMasterTagId ?? card.class.Card,
        label: ('embedded:embedded:' + title) as IntlString,
        kind: 0,
        icon: card.icon.MasterTag
      }
    }
  }

  private async processTag (
    tagPath: string,
    tagConfig: Record<string, any>,
    result: UnifiedDocProcessResult,
    masterTagId: Ref<MasterTag>,
    parentTagId?: Ref<Tag>
  ): Promise<void> {
    const tagId = this.metadataRegistry.getRef(tagPath) as Ref<Tag>
    const tag = await this.createTag(tagConfig, tagPath, masterTagId, parentTagId)

    const attributes = await this.createAttributes(tagPath, tagConfig, tagId)
    this.metadataRegistry.setAttributes(tagPath, attributes)

    const docs = result.docs.get(tagPath) ?? []
    docs.push(tag, ...Array.from(attributes.values()))
    result.docs.set(tagPath, docs)

    // Process child tags
    const tagDir = path.join(path.dirname(tagPath), path.basename(tagPath, '.yaml'))
    if (fs.existsSync(tagDir) && fs.statSync(tagDir).isDirectory()) {
      await this.processTagDirectory(tagDir, result, masterTagId, tagId)
    }
  }

  private async processTagDirectory (
    tagDir: string,
    result: UnifiedDocProcessResult,
    parentMasterTagId: Ref<MasterTag>,
    parentTagId: Ref<Tag>
  ): Promise<void> {
    const entries = fs.readdirSync(tagDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.yaml')) continue
      const childTagPath = path.join(tagDir, entry.name)
      const childTagConfig = yaml.load(fs.readFileSync(childTagPath, 'utf8')) as Record<string, any>

      if (childTagConfig?.class === card.class.Tag) {
        await this.processTag(childTagPath, childTagConfig, result, parentMasterTagId, parentTagId)
      }
    }
  }

  private async createTag (
    data: Record<string, any>,
    filePath: string,
    masterTagId: Ref<MasterTag>,
    parentTagId?: Ref<Tag>
  ): Promise<UnifiedDoc<Tag>> {
    this.validateFormat(data, TagSchema, filePath)

    const { class: _class, title } = data
    if (_class !== card.class.Tag) {
      throw new Error('Invalid tag data')
    }

    return {
      _class: card.class.Tag,
      props: {
        _id: this.metadataRegistry.getRef(filePath) as Ref<Tag>,
        space: core.space.Model,
        extends: parentTagId ?? masterTagId,
        label: ('embedded:embedded:' + title) as IntlString,
        kind: 2,
        icon: card.icon.Tag
      }
    }
  }

  private async createAttributes (
    currentPath: string,
    data: Record<string, any>,
    masterTagId: Ref<MasterTag>
  ): Promise<Map<string, UnifiedDoc<Attribute<MasterTag>>>> {
    if (data.properties === undefined) {
      return new Map()
    }

    const attributesByLabel = new Map<string, UnifiedDoc<Attribute<MasterTag>>>()
    for (const property of data.properties) {
      const type = await this.convertPropertyType(property, currentPath)

      const attr: UnifiedDoc<Attribute<MasterTag>> = {
        _class: core.class.Attribute,
        props: {
          space: core.space.Model,
          attributeOf: masterTagId,
          name: generateId<Attribute<MasterTag>>(),
          label: ('embedded:embedded:' + property.label) as IntlString,
          isCustom: true,
          type,
          defaultValue: property.defaultValue ?? null
        }
      }
      attributesByLabel.set(property.label, attr)
    }
    return attributesByLabel
  }

  private async convertPropertyType (property: Record<string, any>, currentPath: string): Promise<Record<string, any>> {
    let type: Record<string, any> = {}
    if (property.refTo !== undefined) {
      const baseType: Record<string, any> = {}
      baseType._class = core.class.RefTo
      const refPath = path.resolve(path.dirname(currentPath), property.refTo)
      baseType.to = this.metadataRegistry.getRef(refPath)
      baseType.label = core.string.Ref
      type =
        property.isArray === true
          ? {
              _class: core.class.ArrOf,
              label: core.string.Array,
              of: baseType
            }
          : baseType
    } else if (property.enumOf !== undefined) {
      const baseType: Record<string, any> = {}
      baseType._class = core.class.EnumOf
      const enumPath = path.resolve(path.dirname(currentPath), property.enumOf)
      baseType.of = this.metadataRegistry.getRef(enumPath)
      baseType.label = 'core:string:Enum'
      type =
        property.isArray === true
          ? {
              _class: core.class.ArrOf,
              label: core.string.Array,
              of: baseType
            }
          : baseType
    } else {
      switch (property.type) {
        case 'TypeString':
          type._class = core.class.TypeString
          type.label = core.string.String
          break
        case 'TypeNumber':
          type._class = core.class.TypeNumber
          type.label = core.string.Number
          break
        case 'TypeBoolean':
          type._class = core.class.TypeBoolean
          type.label = core.string.Boolean
          break
        default:
          throw new Error('Unsupported type: ' + property.type + ' ' + currentPath)
      }
    }
    return type
  }

  private async createCardWithRelations (
    cardHeader: Record<string, any>,
    cardPath: string,
    masterTagId: Ref<MasterTag>,
    masterTagAssociaions: Map<string, AssociationMetadata>,
    masterTagAttributes: Map<string, UnifiedDoc<Attribute<MasterTag>>>,
    blobFiles: Map<string, UnifiedFile>,
    parentCardId?: Ref<Card>
  ): Promise<UnifiedDoc<Doc>[]> {
    const { _class, title, blobs: rawBlobs, tags: rawTags, ...customProperties } = cardHeader
    const tags = rawTags !== undefined ? (Array.isArray(rawTags) ? rawTags : [rawTags]) : []

    const tagAttributes = new Map<string, UnifiedDoc<Attribute<Tag>>>()
    const tagAssociations = new Map<string, AssociationMetadata>()
    for (const tag of tags) {
      const tagPath = path.resolve(path.dirname(cardPath), tag)
      this.metadataRegistry.getAttributes(tagPath).forEach((attr, propName) => {
        tagAttributes.set(propName, attr)
      })
      this.metadataRegistry.getAssociations(tagPath).forEach((AssociationMetadata, propName) => {
        tagAssociations.set(propName, AssociationMetadata)
      })
    }

    const cardSchema = this.createCardSchema(masterTagAttributes, masterTagAssociaions, tagAttributes, tagAssociations)
    this.validateFormat(cardHeader, cardSchema, cardPath)

    const cardId = this.metadataRegistry.getRef(cardPath) as Ref<Card>
    const cardProps: Record<string, any> = {
      _id: cardId,
      space: 'card:space:Default' as Ref<Space>,
      title,
      parent: parentCardId
    }

    const blobs = rawBlobs !== undefined ? (Array.isArray(rawBlobs) ? rawBlobs : [rawBlobs]) : []
    if (blobs.length > 0) {
      const blobProps: Record<string, BlobType> = {}
      for (const blob of blobs) {
        const blobPath = path.resolve(path.dirname(cardPath), blob)
        const blobFile = blobFiles.get(blobPath)
        if (blobFile === undefined) {
          throw new Error('Blob file not found: ' + blobPath + ' from:' + cardPath)
        }
        blobProps[blobFile._id] = {
          file: blobFile._id,
          type: blobFile.type,
          name: blobFile.name,
          size: blobFile.size,
          metadata: {} // todo: blobFile.metadata
        }
      }
      cardProps.blobs = blobProps
    }

    const relations: UnifiedDoc<Doc>[] = []
    for (const [key, value] of Object.entries(customProperties)) {
      if (masterTagAttributes.has(key)) {
        const attr = masterTagAttributes.get(key)
        if (attr === undefined) {
          throw new Error(`Attribute not found: ${key}, ${cardPath}`)
        }

        const attrProps = attr.props

        const attrType = attrProps.type
        const attrBaseType = attrType._class === core.class.ArrOf ? attrType.of : attrType
        const values = attrType._class === core.class.ArrOf ? value : [value]
        const propValues = []
        for (const val of values) {
          if (attrBaseType._class === core.class.RefTo) {
            const refPath = path.resolve(path.dirname(cardPath), val)
            const ref = this.metadataRegistry.getRef(refPath) as Ref<Card>
            propValues.push(ref)
          } else {
            propValues.push(val)
          }
        }
        cardProps[attrProps.name] = attrType._class === core.class.ArrOf ? propValues : propValues[0]
      } else if (masterTagAssociaions.has(key) || tagAssociations.has(key)) {
        const metadata = masterTagAssociaions.get(key) ?? tagAssociations.get(key)
        if (metadata === undefined) {
          throw new Error(`Association not found: ${key}, ${cardPath}`)
        }
        const values = Array.isArray(value) ? value : [value]
        for (const val of values) {
          const otherCardPath = path.resolve(path.dirname(cardPath), val)
          const otherCardId = this.metadataRegistry.getRef(otherCardPath) as Ref<Card>
          const relation: UnifiedDoc<Relation> = this.createRelation(metadata, cardId, otherCardId)
          relations.push(relation)
        }
      }
    }

    return [
      {
        _class: masterTagId,
        collabField: 'content',
        contentProvider: () => Promise.resolve(this.parser.readMarkdownContent(cardPath)),
        props: cardProps as Props<Card>
      },
      ...relations
    ]
  }

  private createRelation (
    metadata: AssociationMetadata,
    cardId: Ref<Card>,
    otherCardId: Ref<Card>
  ): UnifiedDoc<Relation> {
    const otherCardField = metadata.field === 'docA' ? 'docB' : 'docA'
    const relation: UnifiedDoc<Relation> = {
      _class: core.class.Relation,
      props: {
        _id: generateId<Relation>(),
        space: core.space.Model,
        [metadata.field]: cardId,
        [otherCardField]: otherCardId,
        association: metadata.association
      } as unknown as Props<Relation>
    }
    return relation
  }

  private async applyTags (
    card: UnifiedDoc<Card>,
    cardHeader: Record<string, any>,
    cardPath: string,
    result: UnifiedDocProcessResult
  ): Promise<void> {
    const tags =
      cardHeader.tags !== undefined ? (Array.isArray(cardHeader.tags) ? cardHeader.tags : [cardHeader.tags]) : []
    if (tags.length === 0) return

    const mixins: UnifiedMixin<Card, Tag>[] = []
    for (const tagPath of tags) {
      const cardDir = path.dirname(cardPath)
      const tagAbsPath = path.resolve(cardDir, tagPath)
      const tagId = this.metadataRegistry.getRef(tagAbsPath) as Ref<Tag>

      const tagProps: Record<string, any> = {}
      this.metadataRegistry.getAttributes(tagAbsPath).forEach((attr, label) => {
        const value = cardHeader[label]
        const attrType = attr.props.type
        const attrBaseType = attrType._class === core.class.ArrOf ? attrType.of : attrType
        const values = attrType._class === core.class.ArrOf ? value : [value]
        const propValues: any[] = []
        for (const val of values) {
          if (attrBaseType._class === core.class.RefTo) {
            const refPath = path.resolve(path.dirname(cardPath), val)
            const ref = this.metadataRegistry.getRef(refPath) as Ref<Card>
            propValues.push(ref)
          } else {
            propValues.push(val)
          }
        }
        tagProps[attr.props.name] = attrType._class === core.class.ArrOf ? propValues : propValues[0]
      })

      const mixin: UnifiedMixin<Card, Tag> = {
        _class: card._class,
        mixin: tagId,
        props: {
          _id: card.props._id as Ref<Card>,
          space: core.space.Workspace,
          __mixin: 'true',
          ...tagProps
        } as unknown as Props<Tag>
      }
      mixins.push(mixin)
    }

    if (mixins.length > 0) {
      result.mixins.set(cardPath, mixins)
    }
  }

  private async createAttachments (
    attachments: string[],
    cardPath: string,
    card: UnifiedDoc<Card>,
    result: UnifiedDocProcessResult
  ): Promise<void> {
    for (const attachment of attachments) {
      this.validateFileExists(attachment)

      const attachmentPath = path.resolve(path.dirname(cardPath), attachment)
      const file = await this.createFile(attachmentPath)
      result.files.set(attachmentPath, file)

      const attachmentId = this.metadataRegistry.getRef(attachmentPath) as Ref<Attachment>
      const attachmentDoc: UnifiedDoc<Attachment> = {
        _class: 'attachment:class:Attachment' as Ref<Class<Attachment>>,
        props: {
          _id: attachmentId,
          space: core.space.Workspace,
          attachedTo: card.props._id as Ref<Card>,
          attachedToClass: card._class,
          file: file._id,
          name: file.name,
          collection: 'attachments',
          lastModified: Date.now(),
          type: file.type,
          size: file.size,
          metadata: {} // todo: file.metadata for images
        }
      }
      result.docs.set(attachmentPath, [attachmentDoc])
    }
  }

  private async createBlobs (blobs: string[], cardPath: string, result: UnifiedDocProcessResult): Promise<void> {
    for (const blob of blobs) {
      const blobPath = path.resolve(path.dirname(cardPath), blob)
      const file = await this.createFile(blobPath)
      result.files.set(blobPath, file)
    }
  }

  private async createFile (fileAbsPath: string): Promise<UnifiedFile> {
    this.validateFileExists(fileAbsPath)

    const fileName = path.basename(fileAbsPath)
    const fileUuid = this.metadataRegistry.getBlobUuid(fileAbsPath)
    const type = contentType(fileName)
    const size = fs.statSync(fileAbsPath).size

    const file: UnifiedFile = {
      _id: fileUuid, // id for datastore
      name: fileName,
      type: type !== false ? type : 'application/octet-stream',
      size,
      blobProvider: async () => {
        const data = fs.readFileSync(fileAbsPath)
        const props = type !== false ? { type } : undefined
        return new Blob([data], props)
      }
    }
    return file
  }

  private async createAssociation (filePath: string, data: Record<string, any>): Promise<UnifiedDoc<Association>> {
    this.validateFormat(data, AssociationSchema, filePath)

    const { class: _class, typeA, typeB, type, nameA, nameB } = data

    const currentPath = path.dirname(filePath)
    const associationId = this.metadataRegistry.getRef(filePath) as Ref<Association>

    const typeAPath = path.resolve(currentPath, typeA)
    this.metadataRegistry.addAssociation(typeAPath, nameB, {
      association: associationId,
      field: 'docA',
      type
    })

    const typeBPath = path.resolve(currentPath, typeB)
    this.metadataRegistry.addAssociation(typeBPath, nameA, {
      association: associationId,
      field: 'docB',
      type
    })

    const typeAId = this.metadataRegistry.getRef(typeAPath) as Ref<MasterTag>
    const typeBId = this.metadataRegistry.getRef(typeBPath) as Ref<MasterTag>

    return {
      _class,
      props: {
        _id: associationId,
        space: core.space.Model,
        classA: typeAId,
        classB: typeBId,
        nameA,
        nameB,
        type
      } as unknown as Props<Association>
    }
  }

  private async createEnum (filePath: string, data: Record<string, any>): Promise<UnifiedDoc<Enum>> {
    const { title, values } = data
    const enumId = this.metadataRegistry.getRef(filePath) as Ref<Enum>
    this.validateFormat(data, EnumSchema, filePath)
    return {
      _class: core.class.Enum,
      props: {
        _id: enumId,
        space: core.space.Model,
        name: title,
        enumValues: values
      }
    }
  }

  private createCardSchema (
    masterTagAttributes: Map<string, UnifiedDoc<Attribute<MasterTag>>>,
    masterTagAssociaions: Map<string, AssociationMetadata>,
    tagAttributes: Map<string, UnifiedDoc<Attribute<Tag>>>,
    tagAssociations: Map<string, AssociationMetadata>
  ): FormatSchema {
    const requiredFields = new Map<string, FieldType>()
    const optionalFields = new Map<string, FieldType>()

    // Add required fields
    requiredFields.set('title', {
      type: StringFieldType,
      isArray: false
    })

    // Add master tag and tags attributes
    const allAttrs = new Map([...masterTagAttributes, ...tagAttributes])
    for (const [label, attr] of allAttrs.entries()) {
      const attrType = attr.props.type
      const isArray = attrType._class === core.class.ArrOf
      const baseType = isArray ? attrType.of : attrType

      let fieldType: BaseFieldType

      // Determine field type based on attribute type
      switch (baseType._class) {
        case core.class.TypeString:
          fieldType = StringFieldType
          break
        case core.class.TypeNumber:
          fieldType = NumberFieldType
          break
        case core.class.TypeBoolean:
          fieldType = BooleanFieldType
          break
        case core.class.RefTo:
          fieldType = PathFieldType
          break
        case core.class.EnumOf: {
          const enumValues = this.metadataRegistry.getEnumValues(baseType.of)
          fieldType = new OneOfFieldType(enumValues)
          break
        }
        default:
          throw new Error(`Unsupported attribute type: ${baseType._class}`)
      }

      optionalFields.set(label, {
        type: fieldType,
        isArray
      })
    }

    // Add fields for relations (and from master tag, and from tags)
    const allRelations = new Map([...masterTagAssociaions, ...tagAssociations])
    for (const [label, relation] of allRelations.entries()) {
      optionalFields.set(label, {
        type: PathFieldType,
        isArray: relation.type === 'N:N' || (relation.type === '1:N' && relation.field === 'docA')
      })
    }

    // Add special fields
    optionalFields.set('blobs', {
      type: PathFieldType,
      isArray: true
    })

    optionalFields.set('tags', {
      type: PathFieldType,
      isArray: true
    })

    optionalFields.set('attachments', {
      type: PathFieldType,
      isArray: true
    })

    return {
      requiredFields,
      optionalFields
    }
  }

  private validateFormat (data: Record<string, any>, schema: FormatSchema, filePath: string): void {
    const currentPath = path.dirname(filePath)
    const errors = validateSchema(data, schema, currentPath)
    if (errors.length > 0) {
      throw new Error(
        'Invalid import schema in ' +
          filePath +
          ': \n' +
          Array.from(errors)
            .map((e) => `    * ${e}`)
            .join(';\n') +
          '\n'
      )
    }
  }

  private validateFileExists (fileAbsPath: string): void {
    if (!fs.existsSync(fileAbsPath)) {
      throw new Error('File not found: ' + fileAbsPath)
    }
  }
}
