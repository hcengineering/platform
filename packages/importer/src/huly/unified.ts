// unified.ts
import { Attachment } from '@hcengineering/attachment'
import card, { Card, MasterTag, Tag } from '@hcengineering/card'
import core, {
  Association,
  Attribute,
  BlobType,
  Class,
  Doc,
  Enum,
  generateId,
  Ref,
  Relation
} from '@hcengineering/core'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { contentType } from 'mime-types'
import * as path from 'path'
import { IntlString } from '../../../platform/types'
import { Props, UnifiedDoc, UnifiedFile, UnifiedMixin } from '../types'
import { MetadataStorage, RelationMetadata } from './metadata'
import { readMarkdownContent, readYamlHeader } from './parsing'

export interface UnifiedDocProcessResult {
  docs: Map<string, Array<UnifiedDoc<Doc>>>
  mixins: Map<string, Array<UnifiedMixin<Doc, Doc>>>
  files: Map<string, UnifiedFile>
}

export class UnifiedDocProcessor {
  private readonly metadataStorage = new MetadataStorage()
  async importFromDirectory (directoryPath: string): Promise<UnifiedDocProcessResult> {
    const result: UnifiedDocProcessResult = {
      docs: new Map(),
      mixins: new Map(),
      files: new Map()
    }
    // Первый проход - собираем метаданные
    await this.processMetadata(directoryPath, result)

    await this.processSystemCards(directoryPath, result, new Map(), new Map()) // todo: get master tag relations
    // Второй проход - обрабатываем карточки
    await this.processCards(directoryPath, result, new Map(), new Map())

    return result
  }

  private async processMetadata (
    currentPath: string,
    result: UnifiedDocProcessResult,
    parentMasterTagId?: Ref<MasterTag>
  ): Promise<void> {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })

    // Обрабатываем только YAML файлы
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.yaml')) continue

      const yamlPath = path.resolve(currentPath, entry.name)
      const yamlConfig = yaml.load(fs.readFileSync(yamlPath, 'utf8')) as Record<string, any>

      switch (yamlConfig?.class) {
        case card.class.MasterTag: {
          const masterTagId = this.metadataStorage.getRefByPath(yamlPath) as Ref<MasterTag>
          const masterTag = await this.createMasterTag(yamlConfig, masterTagId, parentMasterTagId)
          const masterTagAttrs = await this.createAttributes(yamlPath, yamlConfig, masterTagId)

          this.metadataStorage.setAttributes(yamlPath, masterTagAttrs)
          result.docs.set(yamlPath, [masterTag, ...Array.from(masterTagAttrs.values())])

          // Рекурсивно обрабатываем поддиректорию
          const masterTagDir = path.join(currentPath, path.basename(yamlPath, '.yaml'))
          if (fs.existsSync(masterTagDir) && fs.statSync(masterTagDir).isDirectory()) {
            await this.processMetadata(masterTagDir, result, masterTagId)
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
          result.docs.set(yamlPath, [enumDoc])
          break
        }
        default:
          throw new Error('Unsupported class: ' + yamlConfig?.class) // todo: handle default case just convert to UnifiedDoc
      }
    }
  }

  private async processCards (
    currentPath: string,
    result: UnifiedDocProcessResult,
    masterTagRelations: Map<string, RelationMetadata>,
    masterTagAttrs: Map<string, UnifiedDoc<Attribute<MasterTag>>>,
    masterTagId?: Ref<MasterTag>
  ): Promise<void> {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })

    // Проверяем, есть ли YAML файл MasterTag'а для текущей директории
    const yamlPath = currentPath + '.yaml'
    if (fs.existsSync(yamlPath)) {
      const yamlConfig = yaml.load(fs.readFileSync(yamlPath, 'utf8')) as Record<string, any>
      if (yamlConfig?.class === card.class.MasterTag) {
        masterTagId = this.metadataStorage.getRefByPath(yamlPath) as Ref<MasterTag>
        this.metadataStorage.getAssociations(yamlPath).forEach((relationMetadata, propName) => {
          masterTagRelations.set(propName, relationMetadata)
        })
        this.metadataStorage.getAttributes(yamlPath).forEach((attr, propName) => {
          masterTagAttrs.set(propName, attr)
        })
      }
    }

    // Обрабатываем MD файлы с учетом текущего MasterTag'а
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const cardPath = path.join(currentPath, entry.name)
        const { class: cardType, ...cardProps } = await readYamlHeader(cardPath)

        if (masterTagId !== undefined) {
          await this.processCard(result, cardPath, cardProps, masterTagId, masterTagRelations, masterTagAttrs)
        }
      }
    }

    // Рекурсивно обрабатываем поддиректории с передачей текущего MasterTag'а
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const dirPath = path.join(currentPath, entry.name)
      await this.processCards(dirPath, result, masterTagRelations, masterTagAttrs, masterTagId)
    }
  }

  private async processSystemCards (
    currentDir: string,
    result: UnifiedDocProcessResult,
    masterTagRelations: Map<string, RelationMetadata>,
    masterTagAttrs: Map<string, UnifiedDoc<Attribute<MasterTag>>>
  ): Promise<void> {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue
      const cardPath = path.join(currentDir, entry.name)
      const { class: cardType, ...cardProps } = await readYamlHeader(cardPath)

      if (cardType.startsWith('card:types:') === false) {
        throw new Error('Unsupported card type: ' + cardType)
      }

      await this.processCard(result, cardPath, cardProps, cardType, masterTagRelations, masterTagAttrs) // todo: get right master tag attributes
    }
  }

  private async processCard (
    result: UnifiedDocProcessResult,
    cardPath: string,
    cardProps: Record<string, any>,
    masterTagId: Ref<MasterTag>,
    masterTagRelations: Map<string, RelationMetadata>,
    masterTagAttrs: Map<string, UnifiedDoc<Attribute<MasterTag>>>,
    parentCardId?: Ref<Card>
  ): Promise<void> {
    if (cardProps.blobs !== undefined) {
      await this.createBlobs(cardProps.blobs, cardPath, result)
    }

    const cardWithRelations = await this.createCardWithRelations(cardProps, cardPath, masterTagId, masterTagRelations, masterTagAttrs, result.files, parentCardId)

    if (cardWithRelations.length > 0) {
      const docs = result.docs.get(cardPath) ?? []
      docs.push(...cardWithRelations)
      result.docs.set(cardPath, docs)

      const card = cardWithRelations[0] as UnifiedDoc<Card>
      await this.applyTags(card, cardProps, cardPath, result)

      if (cardProps.attachments !== undefined) {
        await this.createAttachments(cardProps.attachments, cardPath, card, result)
      }

      const cardDir = path.join(path.dirname(cardPath), path.basename(cardPath, '.md'))
      if (fs.existsSync(cardDir) && fs.statSync(cardDir).isDirectory()) {
        await this.processCardDirectory(result, cardDir, masterTagId, masterTagRelations, masterTagAttrs, card.props._id as Ref<Card>)
      }
    }
  }

  private async processCardDirectory (
    result: UnifiedDocProcessResult,
    cardDir: string,
    masterTagId: Ref<MasterTag>,
    masterTagRelations: Map<string, RelationMetadata>,
    masterTagAttrs: Map<string, UnifiedDoc<Attribute<MasterTag>>>,
    parentCardId?: Ref<Card>
  ): Promise<void> {
    const entries = fs.readdirSync(cardDir, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.md'))

    for (const entry of entries) {
      const childCardPath = path.join(cardDir, entry.name)
      const { class: cardClass, ...cardProps } = await readYamlHeader(childCardPath)
      await this.processCard(result, childCardPath, cardProps, masterTagId, masterTagRelations, masterTagAttrs, parentCardId)
    }
  }

  private async createMasterTag (
    data: Record<string, any>,
    masterTagId: Ref<MasterTag>,
    parentMasterTagId?: Ref<MasterTag>
  ): Promise<UnifiedDoc<MasterTag>> {
    const { class: _class, title } = data
    if (_class !== card.class.MasterTag) {
      throw new Error('Invalid master tag data')
    }

    return {
      _class: card.class.MasterTag,
      props: {
        _id: masterTagId,
        space: core.space.Model,
        extends: parentMasterTagId ?? card.class.Card,
        label: 'embedded:embedded:' + title as IntlString, // todo: check if it's correct
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
    const tagId = this.metadataStorage.getRefByPath(tagPath) as Ref<Tag>
    const tag = await this.createTag(tagConfig, tagId, masterTagId, parentTagId)

    const attributes = await this.createAttributes(tagPath, tagConfig, tagId)
    this.metadataStorage.setAttributes(tagPath, attributes)

    const docs = result.docs.get(tagPath) ?? []
    docs.push(tag, ...Array.from(attributes.values()))
    result.docs.set(tagPath, docs)

    // Обрабатываем дочерние теги
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
    tagId: Ref<Tag>,
    masterTagId: Ref<MasterTag>,
    parentTagId?: Ref<Tag>
  ): Promise<UnifiedDoc<Tag>> {
    const { class: _class, title } = data
    if (_class !== card.class.Tag) {
      throw new Error('Invalid tag data')
    }

    return {
      _class: card.class.Tag,
      props: {
        _id: tagId,
        space: core.space.Model,
        extends: parentTagId ?? masterTagId,
        label: 'embedded:embedded:' + title as IntlString,
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
          label: 'embedded:embedded:' + property.label as IntlString,
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
      baseType.to = this.metadataStorage.getRefByPath(refPath)
      baseType.label = core.string.Ref
      type = property.isArray === true
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
      baseType.of = this.metadataStorage.getRefByPath(enumPath)
      baseType.label = 'core:string:Enum'
      type = property.isArray === true
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
    masterTagRelations: Map<string, RelationMetadata>, // todo: rename to masterTagsAssociations
    masterTagAttrs: Map<string, UnifiedDoc<Attribute<MasterTag>>>,
    blobFiles: Map<string, UnifiedFile>,
    parentCardId?: Ref<Card>
  ): Promise<UnifiedDoc<Doc>[]> {
    const { _class, title, blobs: rawBlobs, tags: rawTags, ...customProperties } = cardHeader
    const tags = rawTags !== undefined ? (Array.isArray(rawTags) ? rawTags : [rawTags]) : []
    const blobs = rawBlobs !== undefined ? (Array.isArray(rawBlobs) ? rawBlobs : [rawBlobs]) : []

    const cardId = this.metadataStorage.getRefByPath(cardPath) as Ref<Card>
    const cardProps: Record<string, any> = {
      _id: cardId,
      space: core.space.Workspace,
      title,
      parent: parentCardId
    }

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
          metadata: {} // todo: blobFile.metadata
        }
      }
      cardProps.blobs = blobProps
    }

    const tagAssociations = new Map<string, RelationMetadata>()
    for (const tag of tags) {
      const tagPath = path.resolve(path.dirname(cardPath), tag)
      this.metadataStorage.getAssociations(tagPath).forEach((relationMetadata, propName) => {
        tagAssociations.set(propName, relationMetadata)
      })
    }

    const relations: UnifiedDoc<Doc>[] = []
    for (const [key, value] of Object.entries(customProperties)) {
      if (masterTagAttrs.has(key)) {
        const attr = masterTagAttrs.get(key)
        if (attr === undefined) {
          throw new Error(`Attribute not found: ${key}, ${cardPath}`) // todo: keep the error till builder validation
        }

        const attrProps = attr.props
        console.log(key, attrProps.name, value)

        const attrType = attrProps.type
        const attrBaseType = attrType._class === core.class.ArrOf ? attrType.of : attrType
        const values = attrType._class === core.class.ArrOf ? value : [value]
        const propValues = []
        for (const val of values) {
          if (attrBaseType._class === core.class.RefTo) {
            const refPath = path.resolve(path.dirname(cardPath), val)
            const ref = this.metadataStorage.getRefByPath(refPath) as Ref<Card>
            propValues.push(ref)
          } else {
            propValues.push(val)
          }
        }
        cardProps[attrProps.name] = attrType._class === core.class.ArrOf ? propValues : propValues[0]
      } else if (masterTagRelations.has(key) || tagAssociations.has(key)) {
        const metadata = masterTagRelations.get(key) ?? tagAssociations.get(key)
        if (metadata === undefined) {
          throw new Error(`Association not found: ${key}, ${cardPath}`) // todo: keep the error till builder validation
        }
        const otherCardPath = path.resolve(path.dirname(cardPath), value) // todo: value can be array of paths
        const otherCardId = this.metadataStorage.getRefByPath(otherCardPath) as Ref<Card>
        const relation: UnifiedDoc<Relation> = this.createRelation(metadata, cardId, otherCardId)
        relations.push(relation)
      }
    }

    return [
      {
        _class: masterTagId,
        collabField: 'content',
        contentProvider: () => readMarkdownContent(cardPath),
        props: cardProps as Props<Card> // todo: what is the correct props type?
      },
      ...relations
    ]
  }

  private createRelation (metadata: RelationMetadata, cardId: Ref<Card>, otherCardId: Ref<Card>): UnifiedDoc<Relation> {
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
    const tags = cardHeader.tags !== undefined ? (Array.isArray(cardHeader.tags) ? cardHeader.tags : [cardHeader.tags]) : []
    if (tags.length === 0) return

    console.log(cardHeader.title, cardHeader.tags)
    const mixins: UnifiedMixin<Card, Tag>[] = []
    for (const tagPath of tags) {
      const cardDir = path.dirname(cardPath)
      const tagAbsPath = path.resolve(cardDir, tagPath)
      const tagId = this.metadataStorage.getRefByPath(tagAbsPath) as Ref<Tag>

      const tagProps: Record<string, any> = {}
      this.metadataStorage.getAttributes(tagAbsPath).forEach((attr, label) => {
        tagProps[attr.props.name] = cardHeader[label]
      })

      const mixin: UnifiedMixin<Card, Tag> = {
        _class: card._class,
        mixin: tagId,
        props: {
          _id: card.props._id as Ref<Card>,
          space: core.space.Workspace,
          __mixin: 'true',
          ...tagProps
        } as unknown as Props<Tag> // todo: what is the correct props type?
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
      const attachmentPath = path.resolve(path.dirname(cardPath), attachment)
      const file = await this.createFile(attachmentPath)
      result.files.set(attachmentPath, file)

      const attachmentId = this.metadataStorage.getRefByPath(attachmentPath) as Ref<Attachment>
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
          size: file.size
        }
      }
      result.docs.set(attachmentPath, [attachmentDoc])
    }
  }

  private async createBlobs (
    blobs: string[],
    cardPath: string,
    result: UnifiedDocProcessResult
  ): Promise<void> {
    for (const blob of blobs) {
      const blobPath = path.resolve(path.dirname(cardPath), blob)
      const file = await this.createFile(blobPath)
      result.files.set(blobPath, file)
    }
  }

  private async createFile (
    fileAbsPath: string
  ): Promise<UnifiedFile> {
    // const fileAbsPath = path.resolve(path.dirname(currentPath), filePath)
    const fileName = path.basename(fileAbsPath)
    const fileUuid = this.metadataStorage.getUuidByPath(fileAbsPath)
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

  private async createAssociation (
    yamlPath: string,
    yamlConfig: Record<string, any>
  ): Promise<UnifiedDoc<Association>> {
    console.log('createAssociation', yamlPath)
    const { class: _class, typeA, typeB, type, nameA, nameB } = yamlConfig

    const currentPath = path.dirname(yamlPath)
    const associationId = this.metadataStorage.getRefByPath(yamlPath) as Ref<Association>

    const typeAPath = path.resolve(currentPath, typeA)
    this.metadataStorage.addAssociation(typeAPath, nameB, {
      association: associationId,
      field: 'docA',
      type
    })

    const typeBPath = path.resolve(currentPath, typeB)
    this.metadataStorage.addAssociation(typeBPath, nameA, {
      association: associationId,
      field: 'docB',
      type
    })

    const typeAId = this.metadataStorage.getRefByPath(typeAPath) as Ref<MasterTag>
    const typeBId = this.metadataStorage.getRefByPath(typeBPath) as Ref<MasterTag>

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

  private async createEnum (
    yamlPath: string,
    yamlConfig: Record<string, any>
  ): Promise<UnifiedDoc<Enum>> {
    const { title, values } = yamlConfig
    const enumId = this.metadataStorage.getRefByPath(yamlPath) as Ref<Enum>
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
}
